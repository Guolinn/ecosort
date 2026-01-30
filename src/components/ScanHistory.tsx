import { motion } from 'framer-motion';
import { Clock, ChevronRight } from 'lucide-react';
import { WasteItem, categoryInfo, WasteCategory } from '@/types/waste';
import { formatDistanceToNow } from 'date-fns';

// Fallback for old categories that don't exist in new system
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

interface ScanHistoryProps {
  items: WasteItem[];
  onItemClick?: (item: WasteItem) => void;
}

export const ScanHistory = ({ items, onItemClick }: ScanHistoryProps) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">No scans yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start scanning to earn points!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 5).map((item, index) => {
        const category = getCategoryInfo(item.category);
        
        return (
          <motion.div
            key={item.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onItemClick?.(item)}
            className="flex items-center gap-3 bg-card p-3 rounded-xl shadow-soft cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
          >
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: `${category.color}20` }}
            >
              {category.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground truncate">{item.name}</p>
                {item.status === 'pending' && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                    Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(item.scannedAt, { addSuffix: true })}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
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
  );
};
