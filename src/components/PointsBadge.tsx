import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface PointsBadgeProps {
  points: number;
  level: number;
  pendingPoints?: number;
}

export const PointsBadge = ({ points, level, pendingPoints = 0 }: PointsBadgeProps) => {
  const pointsToNextLevel = (level * 100) - points;
  const progress = ((points % 100) / 100) * 100;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-card rounded-xl p-3 shadow-card"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full gradient-reward flex items-center justify-center shadow-reward">
            <span className="text-lg font-extrabold text-accent-foreground">{level}</span>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          >
            LVL
          </motion.div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-foreground">{points}</span>
            <span className="text-xs font-semibold text-muted-foreground">pts</span>
            {pendingPoints > 0 && (
              <div className="flex items-center gap-0.5 ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">+{pendingPoints}</span>
              </div>
            )}
          </div>
          
          <div className="mt-1.5">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full gradient-eco rounded-full"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {pointsToNextLevel} pts to level {level + 1}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
