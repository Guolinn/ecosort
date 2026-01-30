import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Megaphone, Bell, Gift, AlertTriangle, Trash2, Users, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'update' | 'alert' | 'reward';
  target_user_id: string | null;
  created_at: string;
  read_by: string[];
}

interface UserOption {
  id: string;
  username: string;
}

export const NotificationsTab = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<string>('announcement');
  const [targetUserId, setTargetUserId] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load notifications
      const { data: notifs, error: notifsError } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (notifsError) throw notifsError;
      setNotifications(notifs || []);

      // Load users for targeting
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .order('username');

      if (profilesError) throw profilesError;
      setUsers(profiles || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: "Load Failed", description: "Unable to load notifications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Missing Fields", description: "Please fill in title and message", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('system_notifications')
        .insert({
          title: title.trim(),
          message: message.trim(),
          type,
          target_user_id: targetUserId === 'all' ? null : targetUserId,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({ 
        title: "Notification Sent", 
        description: targetUserId === 'all' ? 'Sent to all users' : 'Sent to selected user' 
      });

      // Reset form
      setTitle('');
      setMessage('');
      setType('announcement');
      setTargetUserId('all');

      // Reload notifications
      loadData();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({ title: "Send Failed", description: "Unable to send notification", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('system_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast({ title: "Deleted", description: "Notification removed" });
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({ title: "Delete Failed", variant: "destructive" });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Megaphone className="w-3.5 h-3.5" />;
      case 'update': return <Bell className="w-3.5 h-3.5" />;
      case 'alert': return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'reward': return <Gift className="w-3.5 h-3.5" />;
      default: return <Bell className="w-3.5 h-3.5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-100 text-blue-700';
      case 'update': return 'bg-green-100 text-green-700';
      case 'alert': return 'bg-red-100 text-red-700';
      case 'reward': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Create Notification Form */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Send className="w-4 h-4" />
          Send Notification
        </h3>

        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 text-sm"
        />

        <Textarea
          placeholder="Message content..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="text-sm min-h-[80px] resize-none"
        />

        <div className="grid grid-cols-2 gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="announcement">📢 Announcement</SelectItem>
              <SelectItem value="update">🔔 Update</SelectItem>
              <SelectItem value="alert">⚠️ Alert</SelectItem>
              <SelectItem value="reward">🎁 Reward</SelectItem>
            </SelectContent>
          </Select>

          <Select value={targetUserId} onValueChange={setTargetUserId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  All Users
                </span>
              </SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {u.username || `User ${u.id.slice(0, 8)}`}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleSend} 
          disabled={sending}
          className="w-full h-9 text-sm"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Send Notification
        </Button>
      </div>

      {/* Recent Notifications */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Recent Notifications ({notifications.length})
        </h3>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No notifications sent yet
            </p>
          ) : (
            notifications.map((notif, index) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg group"
              >
                <div className={`p-1.5 rounded ${getTypeColor(notif.type)}`}>
                  {getTypeIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm truncate">{notif.title}</p>
                    {notif.target_user_id ? (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        1 user
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        All
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(notif.id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
