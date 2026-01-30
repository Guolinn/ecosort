import { motion } from 'framer-motion';
import { Flame, Leaf, Calendar, Recycle } from 'lucide-react';
import { UserStats } from '@/types/waste';

interface StatsCardProps {
  stats: UserStats;
}

export const StatsCard = ({ stats }: StatsCardProps) => {
  const statItems = [
    { icon: Calendar, label: 'Today', value: stats.scansToday, color: 'text-blue-500' },
    { icon: Flame, label: 'Streak', value: `${stats.streak}d`, color: 'text-orange-500' },
    { icon: Recycle, label: 'Recycled', value: stats.itemsRecycled, color: 'text-primary' },
  ];

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="flex items-center justify-between bg-card rounded-xl px-4 py-2.5 shadow-soft"
    >
      {statItems.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 + index * 0.1 }}
          className="flex items-center gap-2"
        >
          <item.icon className={`w-4 h-4 ${item.color}`} />
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-foreground">{item.value}</span>
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
