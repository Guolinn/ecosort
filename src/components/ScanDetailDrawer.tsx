import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Trash2, Recycle, Sparkles, Clock, CheckCircle, XCircle, ShoppingBag } from 'lucide-react';
import { WasteItem, categoryInfo, DisposalChoice, WasteCategory } from '@/types/waste';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { NanoBananaButton } from '@/components/NanoBananaButton';

// Fallback for old categories
const fallbackCategory = {
  label: 'Other',
  labelCn: '其他',
  color: 'hsl(0 0% 50%)',
  binColor: '#757575',
  icon: '🗑️',
  tip: 'Dispose properly',
  tipCn: '正确处理',
  needsChoice: false,
};

const getCategoryInfo = (category: string) => {
  return categoryInfo[category as WasteCategory] || fallbackCategory;
};

interface ScanDetailDrawerProps {
  item: WasteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDisposalChange?: (item: WasteItem, choice: DisposalChoice) => void;
}

export const ScanDetailDrawer = ({ item, isOpen, onClose, onDisposalChange }: ScanDetailDrawerProps) => {
  const [localCraftImage, setLocalCraftImage] = useState<string | undefined>(item?.craftImageUrl);
  
  if (!item) return null;

  const category = getCategoryInfo(item.category);

  const getStatusIcon = () => {
    switch (item.status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusLabel = () => {
    switch (item.status) {
      case 'pending':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
    }
  };

  const getDisposalLabel = () => {
    switch (item.disposalChoice) {
      case 'donate':
        return { icon: <Gift className="w-4 h-4" />, label: 'Donate', color: 'text-green-600' };
      case 'trade':
        return { icon: <ShoppingBag className="w-4 h-4" />, label: 'Sell/Trade', color: 'text-purple-600' };
      case 'recycle':
        return { icon: <Recycle className="w-4 h-4" />, label: 'Recycle', color: 'text-blue-600' };
      case 'discard':
        return { icon: <Trash2 className="w-4 h-4" />, label: 'Discard', color: 'text-gray-600' };
      default:
        return null;
    }
  };

  const disposalInfo = getDisposalLabel();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-2xl shadow-card max-h-[70vh] flex flex-col"
          >
            {/* Handle bar */}
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Header - Compact */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  {category.icon}
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">{item.name}</h2>
                  <span 
                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${category.color}20`, color: category.color }}
                  >
                    {category.label}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Image + Stats Row */}
            <div className="flex gap-3 mb-3">
              {/* Scanned Image - Smaller */}
              {item.imageUrl && (
                <div className="w-24 h-24 rounded-lg overflow-hidden border border-border flex-shrink-0">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Status and Points - Compact */}
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="bg-secondary rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1">
                    {getStatusIcon()}
                    <span className="text-xs font-semibold">{getStatusLabel()}</span>
                  </div>
                </div>
                
                <div className="bg-secondary rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Points</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-primary">{item.finalPoints}</span>
                    {item.basePoints !== item.finalPoints && (
                      <span className="text-[10px] text-muted-foreground line-through">{item.basePoints}</span>
                    )}
                  </div>
                </div>

                {/* Disposal Choice - Inline */}
                {disposalInfo && (
                  <div className="bg-secondary rounded-lg p-2 col-span-2">
                    <p className="text-[10px] text-muted-foreground">Disposal</p>
                    <div className={`flex items-center gap-1 ${disposalInfo.color}`}>
                      {disposalInfo.icon}
                      <span className="text-xs font-semibold">{disposalInfo.label}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Suggestion - show for all items with suggestion */}
            {item.aiSuggestion && (
              <div className="mb-3 p-2 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-xs text-foreground">
                  💡 {item.aiSuggestion}
                </p>
              </div>
            )}

            {/* Creative Craft Image - With NanoBanana Generation */}
            {item.hasCreativePotential && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <Sparkles className="w-4 h-4 text-yellow-600" />
                  <h3 className="text-xs font-semibold text-yellow-800">Craft Ideas by NanoBanana 🍌</h3>
                </div>
                {item.creativeSuggestion && (
                  <p className="text-[11px] text-yellow-700 mb-2">{item.creativeSuggestion}</p>
                )}
                <NanoBananaButton 
                  scanId={item.id}
                  itemName={item.name}
                  existingCraftImage={localCraftImage || item.craftImageUrl}
                  onImageGenerated={(url) => setLocalCraftImage(url)}
                  compact
                />
              </div>
            )}

            {/* Footer - Time + Close */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(item.scannedAt, { addSuffix: true })}
              </span>
              <Button onClick={onClose} variant="outline" size="sm">
                Close
              </Button>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
