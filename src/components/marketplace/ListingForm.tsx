import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, ImageIcon, Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { MarketplaceListing } from '@/types/marketplace';
import { categoryInfo, WasteCategory } from '@/types/waste';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ListingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    category: string;
    pricePoints: number;
    imageUrl?: string;
    scanId?: string;
  }) => Promise<void>;
  initialData?: Partial<MarketplaceListing>;
  prefillImage?: string;
  prefillCategory?: string;
  prefillScanId?: string;
}

export const ListingForm = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  prefillImage,
  prefillCategory,
  prefillScanId,
}: ListingFormProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(prefillCategory || initialData?.category || '');
  const [pricePoints, setPricePoints] = useState(initialData?.pricePoints?.toString() || '');
  const [imageUrl, setImageUrl] = useState(prefillImage || initialData?.imageUrl || '');
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // All categories can be traded
  const tradeableCategories: WasteCategory[] = ['clothing', 'electronics', 'recyclable', 'compost', 'other'];

  // Reset form when opening with new data
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setDescription(initialData?.description || '');
      setCategory(prefillCategory || initialData?.category || '');
      setPricePoints(initialData?.pricePoints?.toString() || '');
      setImageUrl(prefillImage || initialData?.imageUrl || '');
    }
  }, [isOpen, initialData, prefillCategory, prefillImage]);

  // Cleanup camera on close
  useEffect(() => {
    if (!isOpen && streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      // First show the camera UI so the video element renders
      setShowCamera(true);
      
      // Small delay to ensure video element is mounted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
        },
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Could not access camera. Please grant permissions.');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !user) return;
    
    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // Compress and convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      if (!blob) throw new Error('Failed to capture image');

      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('scan-images')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('scan-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      stopCamera();
      toast.success('Photo captured!');
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Failed to capture photo');
    } finally {
      setCapturing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category || !pricePoints) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        pricePoints: parseInt(pricePoints),
        imageUrl: imageUrl || undefined,
        scanId: prefillScanId,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) { stopCamera(); onClose(); } }}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0">
        <SheetHeader className="p-3 pb-2 border-b border-border">
          <SheetTitle className="text-base">
            {initialData ? 'Edit Listing' : 'Create Listing'}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {initialData ? 'Update your listing details' : 'Take a photo and fill in details. Will go through AI review.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="p-3 space-y-3 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Camera / Image preview */}
          {showCamera ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 inset-x-0 flex justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                  className="bg-white/80"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={capturePhoto}
                  disabled={capturing}
                  className="bg-primary"
                >
                  {capturing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-1" />
                      Capture
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : imageUrl ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={imageUrl}
                alt="Listing"
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={startCamera}
                className="absolute bottom-2 right-2"
              >
                <Camera className="w-4 h-4 mr-1" />
                Retake
              </Button>
            </div>
          ) : (
            <div
              onClick={startCamera}
              className="aspect-video rounded-lg bg-muted flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors border-2 border-dashed border-border"
            >
              <Camera className="w-10 h-10 mb-1.5 opacity-50" />
              <p className="text-sm font-medium">Tap to take photo</p>
              <p className="text-xs opacity-70">Required for listing</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you selling?"
              maxLength={100}
              required
              className="h-9 text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item (condition, size, etc.)"
              rows={2}
              maxLength={500}
              className="text-sm resize-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-[100]">
                {tradeableCategories.map((cat) => {
                  const info = categoryInfo[cat];
                  return (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center gap-2">
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label htmlFor="price" className="text-xs">Price (Points) *</Label>
            <div className="relative">
              <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                min="1"
                max="10000"
                value={pricePoints}
                onChange={(e) => setPricePoints(e.target.value)}
                placeholder="100"
                className="pl-9 h-9 text-sm"
                required
              />
            </div>
          </div>

          {/* AI Review Notice */}
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <p className="font-medium">📋 AI Compliance Review</p>
            <p className="mt-0.5 opacity-80">
              Your listing will be checked by AI. High-risk items require admin approval.
            </p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-10 text-sm"
            disabled={!title.trim() || !category || !pricePoints || !imageUrl || submitting}
          >
            {submitting ? (
              <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : initialData ? (
              'Update Listing'
            ) : (
              'Submit for Review'
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};
