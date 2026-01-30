import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, Megaphone, AlertTriangle, Gift, Info, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { ChatDrawer } from '@/components/marketplace/ChatDrawer';
import { NotificationDetailDrawer } from '@/components/inbox/NotificationDetailDrawer';
import { MarketplaceListing } from '@/types/marketplace';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'update' | 'alert' | 'reward';
  target_user_id: string | null;
  read_by: string[];
  created_at: string;
}

type InboxItem = 
  | { kind: 'message'; data: { listingId: string; listing: MarketplaceListing; otherUserName: string; lastMessage?: { content: string; createdAt: Date } | null; unreadCount: number }; timestamp: Date }
  | { kind: 'notification'; data: SystemNotification; timestamp: Date };

const Inbox = () => {
  const { user, isGuest } = useAuth();
    const { conversations, fetchConversations, markAsRead, loading, error } = useChat();
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<{ listing: MarketplaceListing } | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<SystemNotification | null>(null);
  const [showNotificationDetail, setShowNotificationDetail] = useState(false);

  const fetchSystemNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('system_notifications')
        .select('*')
        .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSystemNotifications(data || []);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchSystemNotifications();

      const notifChannel = supabase
        .channel('inbox-notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_notifications' }, (payload) => {
          const newNotif = payload.new as SystemNotification;
          if (!newNotif.target_user_id || newNotif.target_user_id === user.id) {
            toast.info(newNotif.title);
            fetchSystemNotifications();
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => {
          fetchConversations();
        })
        .subscribe();

      const msgChannel = supabase
        .channel('inbox-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => {
          toast.info('New message');
          fetchConversations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(notifChannel);
        supabase.removeChannel(msgChannel);
      };
    }
  }, [user, fetchConversations, fetchSystemNotifications]);

  // Merge and sort: user messages + targeted notifications first, then general notifications
  const inboxItems = useMemo<InboxItem[]>(() => {
    const msgItems: InboxItem[] = conversations.map(c => ({
      kind: 'message',
      data: c,
      timestamp: c.lastMessage?.createdAt || new Date(0),
    }));
    
    // Split notifications: targeted (to specific user) vs general (broadcast)
    const targetedNotifs: InboxItem[] = systemNotifications
      .filter(n => n.target_user_id !== null)
      .map(n => ({
        kind: 'notification',
        data: n,
        timestamp: new Date(n.created_at),
      }));
    
    const generalNotifs: InboxItem[] = systemNotifications
      .filter(n => n.target_user_id === null)
      .map(n => ({
        kind: 'notification',
        data: n,
        timestamp: new Date(n.created_at),
      }));
    
    // Priority: messages + targeted notifications (sorted by time), then general notifications (sorted by time)
    const priorityItems = [...msgItems, ...targetedNotifs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const lowerItems = generalNotifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return [...priorityItems, ...lowerItems];
  }, [conversations, systemNotifications]);

  const handleConversationClick = (conv: { listing: MarketplaceListing }) => {
    // Proactively mark as read from the Inbox side so unread clears immediately.
    void markAsRead(conv.listing.id).then((ok) => {
      if (ok) fetchConversations();
    });
    setSelectedConversation(conv);
    setShowChat(true);
  };

  const markNotificationRead = async (id: string) => {
    if (!user) return;
    const notification = systemNotifications.find(n => n.id === id);
    if (!notification || isRead(notification)) return;
    const newReadBy = [...(notification.read_by || []), user.id];
    await supabase.from('system_notifications').update({ read_by: newReadBy }).eq('id', id);
    setSystemNotifications(prev => prev.map(n => n.id === id ? { ...n, read_by: newReadBy } : n));
  };

  const handleNotificationClick = (notification: SystemNotification) => {
    markNotificationRead(notification.id);
    setSelectedNotification(notification);
    setShowNotificationDetail(true);
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = systemNotifications.filter(n => !isRead(n));
    if (unread.length === 0) return;
    for (const notif of unread) {
      const newReadBy = [...(notif.read_by || []), user.id];
      await supabase.from('system_notifications').update({ read_by: newReadBy }).eq('id', notif.id);
    }
    setSystemNotifications(prev => prev.map(n => ({ ...n, read_by: [...(n.read_by || []), user.id] })));
    toast.success(`Marked ${unread.length} as read`);
  };

  const isRead = (notif: SystemNotification) => user ? (notif.read_by || []).includes(user.id) : true;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Megaphone className="w-3.5 h-3.5" />;
      case 'update': return <Bell className="w-3.5 h-3.5" />;
      case 'alert': return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'reward': return <Gift className="w-3.5 h-3.5" />;
      default: return <Info className="w-3.5 h-3.5" />;
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

  const unreadNotifCount = systemNotifications.filter(n => !isRead(n)).length;
  const unreadMsgCount = conversations.filter(c => c.unreadCount > 0).length;
  const totalUnread = unreadMsgCount + unreadNotifCount;
  const isLoading = loading || notifLoading;

  if (isGuest) {
    return (
      <div className="min-h-[100dvh] gradient-nature">
        <div className="max-w-md mx-auto px-4 py-6">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <div className="text-center py-12">
            <Bell className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
            <h2 className="text-base font-bold text-foreground mb-1">Login Required</h2>
            <p className="text-sm text-muted-foreground mb-4">Create an account to view messages</p>
            <Link to="/auth"><Button size="sm">Sign Up / Login</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] gradient-nature overflow-x-hidden">
      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Inbox</span>
            {totalUnread > 0 && (
              <span className="px-1.5 py-0.5 bg-destructive text-destructive-foreground text-xs rounded-full">{totalUnread}</span>
            )}
          </div>
          {unreadNotifCount > 0 ? (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-destructive/50" />
            <p className="text-sm text-muted-foreground mb-2">{error}</p>
            <Button size="sm" variant="outline" onClick={() => { fetchConversations(); fetchSystemNotifications(); }}>Retry</Button>
          </div>
        ) : inboxItems.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground mb-1">No messages yet</p>
            <p className="text-xs text-muted-foreground">Messages and notifications will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100dvh-100px)]">
            <div className="space-y-2">
              {inboxItems.map((item) => {
                if (item.kind === 'message') {
                  const conv = item.data;
                  return (
                    <motion.div
                      key={`msg-${conv.listingId}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleConversationClick(conv)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                        conv.unreadCount > 0 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'bg-card/80 border border-border/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {conv.listing.imageUrl ? (
                            <img src={conv.listing.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm">📦</div>
                          )}
                        </div>
                        {/* Text content */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{conv.listing.title}</span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-auto">
                              {conv.lastMessage && formatDistanceToNow(conv.lastMessage.createdAt, { addSuffix: true }).replace('about ', '')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {conv.otherUserName}: {conv.lastMessage?.content || 'No messages'}
                          </p>
                        </div>
                        {/* Unread badge */}
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center flex-shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                } else {
                  const notif = item.data;
                  const read = isRead(notif);
                  return (
                    <motion.div
                      key={`notif-${notif.id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                        read 
                          ? 'bg-card/70 border border-border/40' 
                          : 'bg-primary/10 border border-primary/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeStyle(notif.type)}`}>
                          {getTypeIcon(notif.type)}
                        </div>
                        {/* Text content */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-baseline gap-2">
                            <span className={`text-sm font-medium truncate ${read ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-auto">
                              {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }).replace('about ', '')}
                            </span>
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${read ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                            {notif.message}
                          </p>
                        </div>
                        {/* Unread dot */}
                        {!read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                    </motion.div>
                  );
                }
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      <ChatDrawer
        listing={selectedConversation?.listing || null}
        isOpen={showChat}
        onClose={() => { 
          setShowChat(false); 
          // Refresh conversations to update unread counts
          fetchConversations(); 
        }}
        onRead={() => {
          // Also refresh immediately when messages are read
          fetchConversations();
        }}
      />

      <NotificationDetailDrawer
        notification={selectedNotification}
        isOpen={showNotificationDetail}
        onClose={() => { setShowNotificationDetail(false); setSelectedNotification(null); }}
      />
    </div>
  );
};

export default Inbox;
