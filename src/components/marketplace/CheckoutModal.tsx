import { useState } from 'react';
import { ShoppingBag, Check, AlertCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MarketplaceListing } from '@/types/marketplace';
import { motion } from 'framer-motion';

interface CheckoutModalProps {
  listing: MarketplaceListing | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
  onOpenChat: () => void;
  userPoints: number;
}

export const CheckoutModal = ({
  listing,
  isOpen,
  onClose,
  onConfirm,
  onOpenChat,
  userPoints,
}: CheckoutModalProps) => {
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!listing) return null;

  const canAfford = userPoints >= listing.pricePoints;
  const remainingPoints = userPoints - listing.pricePoints;

  const handleConfirm = async () => {
    setProcessing(true);
    const result = await onConfirm();
    setProcessing(false);
    
    if (result) {
      setSuccess(true);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !processing && !success) {
      onClose();
    }
  };

  const handleOpenChat = () => {
    setSuccess(false);
    onClose();
    onOpenChat();
  };

  const handleDismiss = () => {
    setSuccess(false);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Confirm Purchase</SheetTitle>
        </SheetHeader>

        {success ? (
          // Success state with chat option
          <div className="p-6 text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center"
            >
              <Check className="w-8 h-8 text-green-600" />
            </motion.div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Purchase Complete!</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                You now own "{listing.title}"
              </p>
            </div>
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              💬 A message has been sent to the seller. Chat with them to arrange pickup!
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={handleDismiss}>
                Done
              </Button>
              <Button className="flex-1" onClick={handleOpenChat}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat with Seller
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground">Confirm Purchase</h2>
            </div>

            {/* Item preview */}
            <div className="flex gap-3 p-3 rounded-xl bg-muted/30">
              <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {listing.imageUrl ? (
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    📦
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground text-sm truncate">{listing.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Sold by {listing.sellerName || 'Anonymous'}
                </p>
                <div className="flex items-center gap-1 mt-1 text-primary font-bold text-sm">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{listing.pricePoints} pts</span>
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 p-3 rounded-xl bg-muted/50 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your Points</span>
                <span className="font-medium">{userPoints}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Item Price</span>
                <span className="font-medium text-destructive">-{listing.pricePoints}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-medium">Remaining</span>
                <span className={`font-bold ${remainingPoints >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {remainingPoints}
                </span>
              </div>
            </div>

            {/* Warning if not enough points */}
            {!canAfford && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>You need {Math.abs(remainingPoints)} more points</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={onClose}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!canAfford || processing}
                onClick={handleConfirm}
              >
                {processing ? (
                  <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Pay {listing.pricePoints} pts
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
