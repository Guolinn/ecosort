import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, ChevronRight } from 'lucide-react';
import { WasteItem, categoryInfo, WasteCategory } from '@/types/waste';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

const fallbackCategory = {
  label: 'Other',
  labelCn: '其他',
  color: 'hsl(30 30% 50%)',
  icon: '🗑️',
  tip: 'Dispose properly',
  tipCn: '正确处理',
  needsChoice: false,
};

const getCategoryInfo = (category: string) => {
  return categoryInfo[category as WasteCategory] || fallbackCategory;
};

interface HistoryDrawerProps {
  items: WasteItem[];
  isOpen: boolean;
  onClose: () => void;
  onItemClick: (item: WasteItem) => void;
}

export const HistoryDrawer = ({ items, isOpen, onClose, onItemClick }: HistoryDrawerProps) => {
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
            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-2xl shadow-card max-h-[85vh] flex flex-col"
          >
            {/* Handle bar */}
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3" />
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Scan History</h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {items.length} items
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* History List - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No scans yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start scanning to earn points!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => {
                    const category = getCategoryInfo(item.category);
                    
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => onItemClick(item)}
                        className="flex items-center gap-3 bg-secondary/50 p-3 rounded-xl cursor-pointer hover:bg-secondary transition-colors active:scale-[0.98]"
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          {category.icon}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground truncate text-sm">{item.name}</p>
                            {item.status === 'pending' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded flex-shrink-0">
                                Pending
                              </span>
                            )}
                            {item.status === 'approved' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded flex-shrink-0">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span 
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ backgroundColor: `${category.color}15`, color: category.color }}
                            >
                              {category.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(item.scannedAt, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="gradient-reward px-2 py-1 rounded-full">
                            <span className="text-xs font-bold text-accent-foreground">
                              +{item.finalPoints || item.points}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border">
              <Button onClick={onClose} variant="outline" size="sm" className="w-full">
                Close
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};