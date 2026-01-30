import { useState } from 'react';
import { ShoppingBag, MessageCircle, User, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MarketplaceListing } from '@/types/marketplace';
import { categoryInfo } from '@/types/waste';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface ListingDetailProps {
  listing: MarketplaceListing | null;
  isOpen: boolean;
  onClose: () => void;
  onBuy: (listing: MarketplaceListing) => void;
  onChat: (listing: MarketplaceListing) => void;
  onEdit?: (listing: MarketplaceListing) => void;
  onCancel?: (listing: MarketplaceListing) => void;
  userPoints?: number;
}

export const ListingDetail = ({
  listing,
  isOpen,
  onClose,
  onBuy,
  onChat,
  onEdit,
  onCancel,
  userPoints = 0,
}: ListingDetailProps) => {
  const { user } = useAuth();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!listing) return null;

  const category = categoryInfo[listing.category as keyof typeof categoryInfo];
  const isOwn = listing.sellerId === user?.id;
  const canAfford = userPoints >= listing.pricePoints;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>{listing.title}</SheetTitle>
        </SheetHeader>

        {/* Image */}
        <div className="relative aspect-[16/9] bg-muted flex-shrink-0">
          {listing.imageUrl ? (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              {category?.icon || '📦'}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold text-foreground leading-tight">{listing.title}</h2>
              <div className="flex items-center gap-1 text-lg font-bold text-primary whitespace-nowrap">
                <ShoppingBag className="w-4 h-4" />
                <span>{listing.pricePoints}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <span 
                className="px-1.5 py-0.5 rounded-full font-medium"
                style={{ 
                  backgroundColor: `${category?.color}20`,
                  color: category?.color,
                }}
              >
                {category?.label || listing.category}
              </span>
              <span>•</span>
              <span>{format(listing.createdAt, 'MMM d, yyyy')}</span>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <p className="text-sm text-muted-foreground">{listing.description}</p>
          )}

          {/* Seller */}
          {!isOwn && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span>Sold by {listing.sellerName || 'Anonymous'}</span>
            </div>
          )}

          {!isOwn && !canAfford && listing.status === 'active' && (
            <p className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg py-2">
              You need <span className="font-semibold text-primary">{listing.pricePoints - userPoints}</span> more points
            </p>
          )}
        </div>

        {/* Actions - Fixed at bottom */}
        <div className="flex-shrink-0 p-3 border-t border-border bg-background space-y-2">
          <div className="flex gap-2">
            {isOwn ? (
              <>
                {listing.status === 'active' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9"
                      onClick={() => onEdit?.(listing)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                    {confirmCancel ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 h-9"
                        onClick={() => {
                          onCancel?.(listing);
                          setConfirmCancel(false);
                        }}
                      >
                        Confirm Cancel
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 text-destructive hover:text-destructive"
                        onClick={() => setConfirmCancel(true)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </Button>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9"
                  onClick={() => onChat(listing)}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  Message
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-9"
                  disabled={!canAfford || listing.status !== 'active'}
                  onClick={() => onBuy(listing)}
                >
                  <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                  {listing.status !== 'active' 
                    ? 'Sold' 
                    : canAfford 
                      ? 'Buy Now' 
                      : 'Need Points'
                  }
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
