import { useState } from 'react';
import { Check, X, Clock, Gift, Recycle, Trash2, ShoppingBag, Image as ImageIcon, ZoomIn, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { WasteCategory, ScanStatus, DisposalChoice, categoryInfo } from '@/types/waste';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PendingScan {
  id: string;
  user_id: string;
  item_name: string;
  category: WasteCategory;
  points: number;
  base_points: number;
  final_points: number;
  status: ScanStatus;
  disposal_choice?: DisposalChoice;
  scanned_at: string;
  image_url?: string;
  ai_suggestion?: string;
  username?: string;
}

interface Props {
  pendingScans: PendingScan[];
  onUpdate: () => void;
}

export const PendingScansTab = ({ pendingScans, onUpdate }: Props) => {
  const { toast } = useToast();
  const [selectedScan, setSelectedScan] = useState<PendingScan | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const explainNoRowsAffected = (action: string, table: string, verb: 'UPDATE' | 'INSERT') =>
    `${action}没有实际修改到任何数据（0 rows affected）。通常是 ${table} 缺少允许 admin 的 RLS ${verb} policy（或 policy 条件不匹配）导致的。`;

  const handleApprove = async (scan: PendingScan) => {
    if (processing) return;
    setProcessing(true);

    let statusUpdated = false;
    
    try {
      // 1. Update scan status
      const { data: updatedScanRows, error: updateError } = await supabase
        .from('scan_history')
        .update({ status: 'approved' })
        .eq('id', scan.id)
        .select('id');

      if (updateError) throw updateError;
      if (!updatedScanRows || updatedScanRows.length === 0) {
        throw new Error(explainNoRowsAffected('批准 Scan', 'scan_history', 'UPDATE'));
      }
      statusUpdated = true;

      // 1.5 Trade: ensure a draft listing exists for this scan
      if (scan.disposal_choice === 'trade') {
        const { data: existingListing, error: existingListingError } = await supabase
          .from('marketplace_listings')
          .select('id')
          .eq('scan_id', scan.id)
          .limit(1)
          .maybeSingle();

        if (existingListingError) throw existingListingError;

        if (!existingListing) {
          const { data: insertedListingRows, error: insertListingError } = await supabase
            .from('marketplace_listings')
            .insert({
              seller_id: scan.user_id,
              scan_id: scan.id,
              title: scan.item_name,
              description: `Item scanned for trade: ${scan.item_name}`,
              image_url: scan.image_url ?? null,
              category: scan.category,
              price_points: scan.final_points,
              status: 'draft',
              updated_at: new Date().toISOString(),
            })
            .select('id');

          if (insertListingError) throw insertListingError;
          if (!insertedListingRows || insertedListingRows.length === 0) {
            throw new Error(explainNoRowsAffected('创建 Trade 草稿 Listing', 'marketplace_listings', 'INSERT'));
          }
        }
      }

      // 2. Update user points and level
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points, level, items_recycled')
        .eq('id', scan.user_id)
        .maybeSingle();

      if (profile) {
        const newPoints = (profile.total_points || 0) + scan.final_points;
        const newLevel = Math.floor(newPoints / 100) + 1;

        const { data: updatedProfileRows, error: profileError } = await supabase
          .from('profiles')
          .update({
            total_points: newPoints,
            level: newLevel,
            items_recycled: (profile.items_recycled || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', scan.user_id)
          .select('id');

        if (profileError) throw profileError;
        if (!updatedProfileRows || updatedProfileRows.length === 0) {
          throw new Error(explainNoRowsAffected('发放积分/更新用户档案', 'profiles', 'UPDATE'));
        }
      }

      // 3. Send notification to user
      const { data: insertedNotificationRows, error: notifyError } = await supabase
        .from('system_notifications')
        .insert({
          title: 'Scan Approved! 🎉',
          message: `Your "${scan.item_name}" scan was approved. You earned ${scan.final_points} points!`,
          type: 'reward',
          target_user_id: scan.user_id,
        })
        .select('id');

      if (notifyError) throw notifyError;
      if (!insertedNotificationRows || insertedNotificationRows.length === 0) {
        throw new Error(explainNoRowsAffected('发送系统通知', 'system_notifications', 'INSERT'));
      }

      // 4. Special handling for trade items
      if (scan.disposal_choice === 'trade') {
        toast({ 
          title: "Scan Approved ✓", 
          description: `Trade item "${scan.item_name}" - user can now submit listing` 
        });
      } else {
        toast({ 
          title: "Approved ✓", 
          description: `${scan.username} earned ${scan.final_points} pts` 
        });
      }

      setSelectedScan(null);
      onUpdate();
    } catch (error) {
      console.error('Error approving scan:', error);

      // Best-effort rollback to keep items in pending if downstream steps fail
      if (statusUpdated) {
        await supabase
          .from('scan_history')
          .update({ status: 'pending' })
          .eq('id', scan.id);
      }

      toast({ 
        title: "Action Failed", 
        description: error instanceof Error ? error.message : "Unable to approve this scan", 
        variant: "destructive" 
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (scan: PendingScan) => {
    if (processing) return;
    setProcessing(true);

    let statusUpdated = false;
    
    try {
      const { data: updatedScanRows, error } = await supabase
        .from('scan_history')
        .update({ status: 'rejected' })
        .eq('id', scan.id)
        .select('id');

      if (error) throw error;
      if (!updatedScanRows || updatedScanRows.length === 0) {
        throw new Error(explainNoRowsAffected('拒绝 Scan', 'scan_history', 'UPDATE'));
      }
      statusUpdated = true;

      // Send notification
      const { data: insertedNotificationRows, error: notifyError } = await supabase
        .from('system_notifications')
        .insert({
          title: 'Scan Rejected',
          message: `Your "${scan.item_name}" scan was not approved. Please try again with a clearer image.`,
          type: 'alert',
          target_user_id: scan.user_id,
        })
        .select('id');

      if (notifyError) throw notifyError;
      if (!insertedNotificationRows || insertedNotificationRows.length === 0) {
        throw new Error(explainNoRowsAffected('发送系统通知', 'system_notifications', 'INSERT'));
      }

      toast({ title: "Rejected", description: `Rejected ${scan.item_name}` });
      setSelectedScan(null);
      onUpdate();
    } catch (error) {
      console.error('Error rejecting scan:', error);

      if (statusUpdated) {
        await supabase
          .from('scan_history')
          .update({ status: 'pending' })
          .eq('id', scan.id);
      }

      toast({ 
        title: "Action Failed", 
        description: error instanceof Error ? error.message : "Unable to reject this scan", 
        variant: "destructive" 
      });
    } finally {
      setProcessing(false);
    }
  };

  const getDisposalIcon = (choice?: DisposalChoice) => {
    switch (choice) {
      case 'donate': return <Gift className="w-3.5 h-3.5 text-green-600" />;
      case 'trade': return <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />;
      case 'recycle': return <Recycle className="w-3.5 h-3.5 text-blue-600" />;
      case 'discard': return <Trash2 className="w-3.5 h-3.5 text-gray-600" />;
      default: return null;
    }
  };

  const getDisposalLabel = (choice?: DisposalChoice) => {
    switch (choice) {
      case 'donate': return 'Donate';
      case 'trade': return 'Trade';
      case 'recycle': return 'Recycle';
      case 'discard': return 'Discard';
      default: return '-';
    }
  };

  if (pendingScans.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="font-medium text-foreground">No pending items</p>
        <p className="text-sm text-muted-foreground">All scans have been reviewed</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
      {pendingScans.map((scan) => {
          const category = categoryInfo[scan.category] ?? categoryInfo.other;

          return (
            <div
              key={scan.id}
              onClick={() => setSelectedScan(scan)}
              className="flex items-center gap-2.5 p-2.5 bg-card rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {/* Thumbnail */}
              {scan.image_url ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  <img 
                    src={scan.image_url} 
                    alt={scan.item_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-muted shrink-0">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm text-foreground truncate">{scan.item_name}</p>
                  <span 
                    className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                  >
                    {category.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  <User className="w-3 h-3" />
                  <span>@{scan.username}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(scan.scanned_at), { addSuffix: true })}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {getDisposalIcon(scan.disposal_choice)}
                <span className="font-bold text-sm text-primary">+{scan.final_points}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedScan} onOpenChange={(open) => !open && setSelectedScan(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          {selectedScan && (
            <>
              <SheetHeader className="p-4 pb-2 border-b border-border">
                <SheetTitle className="text-base">Review Scan</SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Image */}
                {selectedScan.image_url ? (
                  <div 
                    className="relative rounded-xl overflow-hidden cursor-zoom-in"
                    onClick={() => setPreviewImage(selectedScan.image_url!)}
                  >
                    <img 
                      src={selectedScan.image_url} 
                      alt={selectedScan.item_name}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <ZoomIn className="w-3 h-3" />
                      Enlarge
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-muted flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}

                {/* Item Info */}
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedScan.item_name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>@{selectedScan.username}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(selectedScan.scanned_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-semibold text-sm mt-0.5" style={{ color: (categoryInfo[selectedScan.category] ?? categoryInfo.other).color }}>
                      {(categoryInfo[selectedScan.category] ?? categoryInfo.other).label}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Method</p>
                    <p className="font-semibold text-sm mt-0.5 flex items-center justify-center gap-1">
                      {getDisposalIcon(selectedScan.disposal_choice)}
                      {getDisposalLabel(selectedScan.disposal_choice)}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="font-bold text-sm text-primary mt-0.5">+{selectedScan.final_points}</p>
                  </div>
                </div>

                {/* AI Suggestion */}
                {selectedScan.ai_suggestion && selectedScan.ai_suggestion !== 'null' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-medium text-amber-800 mb-1">🤖 AI Suggestion</p>
                    <p className="text-sm text-amber-700">{selectedScan.ai_suggestion}</p>
                  </div>
                )}

                {/* Trade Notice */}
                {selectedScan.disposal_choice === 'trade' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-xs font-medium text-purple-800 mb-1">🛍️ Trade Item</p>
                    <p className="text-sm text-purple-700">
                      Approving will allow user to publish a marketplace listing.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border bg-background flex gap-3">
                <Button 
                  variant="outline"
                  className="flex-1 h-11 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => handleReject(selectedScan)}
                  disabled={processing}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selectedScan)}
                  disabled={processing}
                >
                  {processing ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Approve
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Fullscreen Image Preview */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewImage && (
            <img 
              src={previewImage} 
              alt="Scan preview" 
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
