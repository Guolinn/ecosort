import { useState, useEffect } from 'react';
import { Check, X, ShoppingBag, Image as ImageIcon, ZoomIn, User, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PendingListing {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  image_url?: string;
  category: string;
  price_points: number;
  status: string;
  created_at: string;
  updated_at: string;
  seller_name?: string;
  condition?: string;
  pickup_method?: string;
  risk_score?: number;
}

export const PendingListingsTab = () => {
  const { toast } = useToast();
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<PendingListing | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingListings();

    // Real-time subscription
    const channel = supabase
      .channel('admin-pending-listings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_listings',
        },
        () => {
          loadPendingListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPendingListings = async () => {
    try {
      const { data: listingsData, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'pending_review')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get seller names
      const sellerIds = [...new Set((listingsData || []).map(l => l.seller_id))];
      
      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', sellerIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p.username]));

        const mapped = (listingsData || []).map((item) => ({
          ...item,
          seller_name: profileMap.get(item.seller_id) || 'Unknown',
        }));

        setListings(mapped);
      } else {
        setListings([]);
      }
    } catch (error) {
      console.error('Error loading pending listings:', error);
      toast({ title: 'Load Failed', description: 'Unable to load pending listings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (listing: PendingListing) => {
    if (processing) return;
    setProcessing(true);

    let statusUpdated = false;
    
    try {
      const { data: updatedListingRows, error } = await supabase
        .from('marketplace_listings')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id)
        .select('id');

      if (error) throw error;

      if (!updatedListingRows || updatedListingRows.length === 0) {
        throw new Error('批准 Listing 没有实际修改到任何数据（0 rows affected）。这通常是权限/RLS 策略阻止导致的。');
      }

      statusUpdated = true;

      // Send notification to seller
      const { data: insertedNotificationRows, error: notifyError } = await supabase
        .from('system_notifications')
        .insert({
          title: 'Listing Approved! 🎉',
          message: `Your listing "${listing.title}" is now live on the marketplace.`,
          type: 'reward',
          target_user_id: listing.seller_id,
        })
        .select('id');

      if (notifyError) throw notifyError;
      if (!insertedNotificationRows || insertedNotificationRows.length === 0) {
        throw new Error('发送系统通知没有实际写入（0 rows affected）。这通常是权限/RLS 策略阻止导致的。');
      }

      toast({ title: 'Approved ✓', description: `"${listing.title}" is now live` });
      setSelectedListing(null);
      loadPendingListings();
    } catch (error) {
      console.error('Error approving listing:', error);

      // Best-effort rollback if downstream step fails
      if (statusUpdated) {
        await supabase
          .from('marketplace_listings')
          .update({ status: 'pending_review', updated_at: new Date().toISOString() })
          .eq('id', listing.id);
      }

      toast({ title: 'Action Failed', description: 'Unable to approve listing', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (listing: PendingListing) => {
    if (processing) return;
    setProcessing(true);

    let statusUpdated = false;
    
    try {
      const { data: updatedListingRows, error } = await supabase
        .from('marketplace_listings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id)
        .select('id');

      if (error) throw error;

      if (!updatedListingRows || updatedListingRows.length === 0) {
        throw new Error('拒绝 Listing 没有实际修改到任何数据（0 rows affected）。这通常是权限/RLS 策略阻止导致的。');
      }

      statusUpdated = true;

      // Send notification to seller
      const { data: insertedNotificationRows, error: notifyError } = await supabase
        .from('system_notifications')
        .insert({
          title: 'Listing Rejected',
          message: `Your listing "${listing.title}" was not approved. Please review our guidelines and try again.`,
          type: 'alert',
          target_user_id: listing.seller_id,
        })
        .select('id');

      if (notifyError) throw notifyError;
      if (!insertedNotificationRows || insertedNotificationRows.length === 0) {
        throw new Error('发送系统通知没有实际写入（0 rows affected）。这通常是权限/RLS 策略阻止导致的。');
      }

      toast({ title: 'Rejected', description: `"${listing.title}" was rejected` });
      setSelectedListing(null);
      loadPendingListings();
    } catch (error) {
      console.error('Error rejecting listing:', error);

      if (statusUpdated) {
        await supabase
          .from('marketplace_listings')
          .update({ status: 'pending_review', updated_at: new Date().toISOString() })
          .eq('id', listing.id);
      }

      toast({ title: 'Action Failed', description: 'Unable to reject listing', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="font-medium text-foreground">No pending listings</p>
        <p className="text-sm text-muted-foreground">All listings have been reviewed</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        {listings.map((listing) => (
          <div
            key={listing.id}
            onClick={() => setSelectedListing(listing)}
            className="flex items-center gap-2.5 p-2.5 bg-card rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
          >
            {/* Thumbnail */}
            {listing.image_url ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                <img 
                  src={listing.image_url} 
                  alt={listing.title}
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
                <p className="font-medium text-sm text-foreground truncate">{listing.title}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 bg-purple-100 text-purple-700">
                  {listing.category}
                </span>
                {listing.risk_score && listing.risk_score >= 7 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 bg-red-100 text-red-700 font-bold flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {listing.risk_score}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                <User className="w-3 h-3" />
                <span>@{listing.seller_name}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(listing.updated_at), { addSuffix: true })}</span>
              </div>
            </div>

            <span className="font-bold text-sm text-primary shrink-0">{listing.price_points} pts</span>
          </div>
        ))}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedListing} onOpenChange={(open) => !open && setSelectedListing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          {selectedListing && (
            <>
              <SheetHeader className="p-4 pb-2 border-b border-border">
                <SheetTitle className="text-base">Review Listing</SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Image */}
                {selectedListing.image_url ? (
                  <div 
                    className="relative rounded-xl overflow-hidden cursor-zoom-in"
                    onClick={() => setPreviewImage(selectedListing.image_url!)}
                  >
                    <img 
                      src={selectedListing.image_url} 
                      alt={selectedListing.title}
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

                {/* Listing Info */}
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedListing.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>@{selectedListing.seller_name}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(selectedListing.updated_at), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-semibold text-sm mt-0.5 text-purple-700">{selectedListing.category}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-bold text-sm text-primary mt-0.5">{selectedListing.price_points} pts</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Condition</p>
                    <p className="font-semibold text-sm mt-0.5 capitalize">
                      {selectedListing.condition?.replace('_', ' ') || '-'}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {selectedListing.description && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedListing.description}</p>
                  </div>
                )}

                {/* Risk Warning */}
                {selectedListing.risk_score && selectedListing.risk_score >= 7 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 font-medium text-sm mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      High Risk Score: {selectedListing.risk_score}/10
                    </div>
                    <p className="text-xs text-red-700">
                      This listing was flagged for manual review due to potential policy concerns.
                    </p>
                  </div>
                )}

                {/* Pickup Method */}
                {selectedListing.pickup_method && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-medium text-blue-800 mb-1">📍 Pickup Method</p>
                    <p className="text-sm text-blue-700 capitalize">
                      {selectedListing.pickup_method.replace('_', ' ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border bg-background flex gap-3">
                <Button 
                  variant="outline"
                  className="flex-1 h-11 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => handleReject(selectedListing)}
                  disabled={processing}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  className="flex-1 h-11 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(selectedListing)}
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
              alt="Listing preview" 
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
