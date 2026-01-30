import { motion, AnimatePresence } from 'framer-motion';
import { X, Megaphone, Bell, AlertTriangle, Gift, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'update' | 'alert' | 'reward';
  target_user_id: string | null;
  read_by: string[];
  created_at: string;
}

interface NotificationDetailDrawerProps {
  notification: SystemNotification | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDetailDrawer = ({ notification, isOpen, onClose }: NotificationDetailDrawerProps) => {
  if (!notification) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Megaphone className="w-5 h-5" />;
      case 'update': return <Bell className="w-5 h-5" />;
      case 'alert': return <AlertTriangle className="w-5 h-5" />;
      case 'reward': return <Gift className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-500/20 text-blue-600';
      case 'update': return 'bg-green-500/20 text-green-600';
      case 'alert': return 'bg-red-500/20 text-red-600';
      case 'reward': return 'bg-yellow-500/20 text-yellow-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'announcement': return 'Announcement';
      case 'update': return 'Update';
      case 'alert': return 'Alert';
      case 'reward': return 'Reward';
      default: return 'Info';
    }
  };

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
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 max-h-[80vh] bg-background z-50 rounded-t-2xl shadow-xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-4 pb-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeStyle(notification.type)}`}>
                  {getTypeIcon(notification.type)}
                </div>
                <div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getTypeStyle(notification.type)}`}>
                    {getTypeLabel(notification.type)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(notification.created_at), 'PPP · p')}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {notification.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {notification.message}
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
