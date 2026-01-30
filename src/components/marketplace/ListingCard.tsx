import { motion } from 'framer-motion';
import { ShoppingBag, Tag, Package, Truck } from 'lucide-react';
import { MarketplaceListing } from '@/types/marketplace';
import { categoryInfo } from '@/types/waste';

interface ListingCardProps {
  listing: MarketplaceListing;
  onClick: () => void;
  isOwn?: boolean;
}

const conditionLabels: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-emerald-100 text-emerald-700' },
  like_new: { label: 'Like New', color: 'bg-green-100 text-green-700' },
  good: { label: 'Good', color: 'bg-blue-100 text-blue-700' },
  fair: { label: 'Fair', color: 'bg-amber-100 text-amber-700' },
  poor: { label: 'Poor', color: 'bg-orange-100 text-orange-700' },
};

const pickupLabels: Record<string, { label: string; icon: typeof Truck }> = {
  meetup: { label: 'Meetup', icon: Package },
  delivery: { label: 'Delivery', icon: Truck },
  pickup_point: { label: 'Pickup Point', icon: Package },
};

export const ListingCard = ({ listing, onClick, isOwn }: ListingCardProps) => {
  const category = categoryInfo[listing.category as keyof typeof categoryInfo];
  const condition = conditionLabels[listing.condition || 'good'];
  const pickup = pickupLabels[listing.pickupMethod || 'meetup'];
  const PickupIcon = pickup?.icon || Package;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card rounded-lg overflow-hidden shadow-sm border border-border cursor-pointer transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            {category?.icon || '📦'}
          </div>
        )}
        
        {/* Condition badge */}
        {condition && (
          <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${condition.color}`}>
            {condition.label}
          </div>
        )}
        
        {/* Status badge */}
        {isOwn && listing.status !== 'active' && (
          <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
            listing.status === 'sold' 
              ? 'bg-green-500/90 text-white' 
              : 'bg-muted/90 text-muted-foreground'
          }`}>
            {listing.status === 'sold' ? 'Sold' : 'Cancelled'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <h3 className="text-sm font-medium text-foreground truncate">{listing.title}</h3>
        
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Tag className="w-2.5 h-2.5" />
            <span>{category?.label || listing.category}</span>
          </div>
          
          <div className="flex items-center gap-0.5 text-primary font-bold text-sm">
            <ShoppingBag className="w-3 h-3" />
            <span>{listing.pricePoints}</span>
          </div>
        </div>

        {/* Pickup method */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
          <PickupIcon className="w-2.5 h-2.5" />
          <span>{pickup?.label || 'Meetup'}</span>
        </div>

        {!isOwn && listing.sellerName && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
            by {listing.sellerName}
          </p>
        )}
      </div>
    </motion.div>
  );
};
