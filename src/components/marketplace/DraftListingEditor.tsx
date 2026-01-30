import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Sparkles, Check, Loader2, ImageIcon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { MarketplaceListing, ItemCondition, PickupMethod } from '@/types/marketplace';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface DraftListingEditorProps {
  listing: MarketplaceListing;
  isOpen: boolean;
  onClose: () => void;
  onPublish: () => void;
}

interface ComplianceResult {
  riskScore: number;
  violations: string[];
  summary: string;
  action: 'auto_approve' | 'needs_review' | 'auto_reject';
}

const conditionOptions: { value: ItemCondition; label: string }[] = [
  { value: 'new', label: 'New (unused)' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair (some wear)' },
  { value: 'poor', label: 'Poor (damaged)' },
];

const pickupOptions: { value: PickupMethod; label: string }[] = [
  { value: 'meetup', label: 'Meet in person' },
  { value: 'delivery', label: 'Delivery available' },
  { value: 'pickup_point', label: 'Pickup point' },
];

export const DraftListingEditor = ({
  listing,
  isOpen,
  onClose,
  onPublish,
}: DraftListingEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description || '');
  const [pricePoints, setPricePoints] = useState(listing.pricePoints.toString());
  const [imageUrl, setImageUrl] = useState(listing.imageUrl || '');
  const [condition, setCondition] = useState<ItemCondition>(listing.condition || 'good');
  const [pickupMethod, setPickupMethod] = useState<PickupMethod>(listing.pickupMethod || 'meetup');
  
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

  // Reset form when listing changes
  useEffect(() => {
    if (isOpen && listing) {
      setTitle(listing.title);
      setDescription(listing.description || '');
      setPricePoints(listing.pricePoints.toString());
      setImageUrl(listing.imageUrl || '');
      setCondition(listing.condition || 'good');
      setPickupMethod(listing.pickupMethod || 'meetup');
      setComplianceResult(null);
    }
  }, [isOpen, listing]);

  const handleImageUpload = async (file: File) => {
    if (!user) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('scan-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('scan-images')
        .getPublicUrl(fileName);

      setImageUrl(urlData.publicUrl);
      toast({ title: 'Image uploaded', description: 'New image set for listing' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: 'Could not upload image', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      
      stream.getTracks().forEach(track => track.stop());
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          await handleImageUpload(file);
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('Camera error:', error);
      toast({ title: 'Camera error', description: 'Could not access camera', variant: 'destructive' });
    }
  };

  const checkCompliance = async () => {
    if (!title.trim()) {
      toast({ title: 'Missing title', description: 'Please enter a title first', variant: 'destructive' });
      return;
    }

    setChecking(true);
    setComplianceResult(null);

    try {
      // Try edge function first
      const response = await supabase.functions.invoke('check-listing-compliance', {
        body: {
          title: title.trim(),
          description: description.trim(),
          category: listing.category,
          imageUrl,
        },
      });

      if (response.error) throw response.error;

      const result = response.data as ComplianceResult;
      setComplianceResult(result);

      if (result.action === 'auto_reject') {
        toast({ 
          title: 'Content Rejected', 
          description: 'This listing violates our policies',
          variant: 'destructive' 
        });
      } else if (result.action === 'auto_approve') {
        toast({ 
          title: 'Content Approved!', 
          description: 'Your listing looks good. You can publish it now.' 
        });
      } else {
        toast({ 
          title: 'Review Required', 
          description: 'Admin will review your listing before it goes live.' 
        });
      }
    } catch (error) {
      console.error('Compliance check error:', error);
      
      // Fallback: local validation when edge function fails
      const titleLower = title.toLowerCase();
      const descLower = (description || '').toLowerCase();
      const combinedText = titleLower + ' ' + descLower;
      
      const badWords = ['weapon', 'gun', 'drug', 'stolen', 'fake', 'counterfeit', 'illegal'];
      const hasBadWords = badWords.some(word => combinedText.includes(word));
      
      const fallbackResult: ComplianceResult = {
        riskScore: hasBadWords ? 8 : 2,
        violations: hasBadWords ? ['Potential policy violation detected'] : [],
        summary: hasBadWords ? 'Manual review required' : 'Auto-approved (offline check)',
        action: hasBadWords ? 'needs_review' : 'auto_approve',
      };
      
      setComplianceResult(fallbackResult);
      
      if (fallbackResult.action === 'auto_approve') {
        toast({ 
          title: 'Quick Check Passed ✓', 
          description: 'Your listing looks good!' 
        });
      } else {
        toast({ 
          title: 'Review Required', 
          description: 'Admin will review your listing' 
        });
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !pricePoints) {
      toast({ title: 'Missing fields', description: 'Please fill in title and price', variant: 'destructive' });
      return;
    }

    // Run compliance check if not done yet
    if (!complianceResult) {
      await checkCompliance();
      return;
    }

    if (complianceResult.action === 'auto_reject') {
      toast({ title: 'Cannot Submit', description: 'Please fix the violations first', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Determine final status based on compliance
      const newStatus = complianceResult.action === 'auto_approve' ? 'active' : 'pending_review';

      const { error } = await supabase
        .from('marketplace_listings')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price_points: parseInt(pricePoints),
          image_url: imageUrl || null,
          condition,
          pickup_method: pickupMethod,
          risk_score: complianceResult.riskScore,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (error) throw error;

      // Notify user based on outcome
      if (newStatus === 'active') {
        toast({ 
          title: 'Listed Successfully! 🎉', 
          description: 'Your item is now live on the marketplace' 
        });

        // Send notification
        await supabase.from('system_notifications').insert({
          title: 'Listing Live! 🛍️',
          message: `Your listing "${title.trim()}" is now active on the marketplace.`,
          type: 'reward',
          target_user_id: user?.id,
        });
      } else {
        toast({ 
          title: 'Submitted for Review', 
          description: 'Admin will review your listing soon' 
        });
      }

      onPublish();
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
      toast({ title: 'Submit failed', description: 'Could not submit listing', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await supabase
        .from('marketplace_listings')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price_points: parseInt(pricePoints) || listing.pricePoints,
          image_url: imageUrl || null,
          condition,
          pickup_method: pickupMethod,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      toast({ title: 'Draft Saved' });
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const getComplianceColor = () => {
    if (!complianceResult) return '';
    if (complianceResult.riskScore < 4) return 'bg-green-50 border-green-200 text-green-800';
    if (complianceResult.riskScore < 7) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-red-50 border-red-200 text-red-800';
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleSaveDraft()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0">
        <SheetHeader className="p-3 pb-2 border-b border-border">
          <SheetTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Edit Listing
          </SheetTitle>
          <SheetDescription className="text-xs">
            Review AI-generated content and customize
          </SheetDescription>
        </SheetHeader>

        <div className="p-3 space-y-3 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Image Section */}
          <div className="space-y-1.5">
            <Label className="text-xs">Product Image</Label>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              {imageUrl ? (
                <img src={imageUrl} alt="Listing" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-10 h-10 mb-1.5 opacity-50" />
                  <p className="text-xs">No image</p>
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={handleCameraCapture}
                disabled={uploading}
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Camera
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setComplianceResult(null); }}
              placeholder="What are you selling?"
              maxLength={100}
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">AI-generated, feel free to edit</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setComplianceResult(null); }}
              placeholder="Describe your item (condition, size, brand, etc.)"
              rows={2}
              maxLength={500}
              className="text-sm resize-none"
            />
          </div>

          {/* Condition & Pickup - Side by side */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Condition *</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as ItemCondition)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-[100]">
                  {conditionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Pickup *</Label>
              <Select value={pickupMethod} onValueChange={(v) => setPickupMethod(v as PickupMethod)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-[100]">
                  {pickupOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label htmlFor="price" className="text-xs">Price (Points) *</Label>
            <Input
              id="price"
              type="number"
              min="1"
              max="10000"
              value={pricePoints}
              onChange={(e) => setPricePoints(e.target.value)}
              placeholder="100"
              className="h-9 text-sm"
            />
          </div>

          {/* Compliance Result */}
          {complianceResult && (
            <div className={`p-2.5 rounded-lg border text-xs ${getComplianceColor()}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {complianceResult.riskScore < 7 ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span className="font-semibold">
                  Risk Score: {complianceResult.riskScore}/10
                </span>
              </div>
              <p>{complianceResult.summary}</p>
              {complianceResult.violations.length > 0 && (
                <ul className="mt-1.5 list-disc list-inside">
                  {complianceResult.violations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-background">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-9 text-sm"
              onClick={handleSaveDraft}
              disabled={submitting || checking}
            >
              Save Draft
            </Button>
            <Button
              className="flex-1 h-9 text-sm"
              onClick={handleSubmit}
              disabled={!title.trim() || !pricePoints || submitting || checking || (complianceResult?.action === 'auto_reject')}
            >
              {checking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Checking...
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Submitting...
                </>
              ) : !complianceResult ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                  Check & Submit
                </>
              ) : complianceResult.action === 'auto_approve' ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Publish Now
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Submit for Review
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
