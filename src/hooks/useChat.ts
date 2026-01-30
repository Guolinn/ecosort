import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Message, Conversation } from '@/types/marketplace';
import { toast } from 'sonner';

export const useChat = (listingId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch messages for a specific listing
  const fetchMessages = useCallback(async (targetListingId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch messages without nested relation (avoiding foreign key issues)
      const { data, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('listing_id', targetListingId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      // Get unique user IDs to fetch usernames
      const userIds = new Set<string>();
      (data || []).forEach((msg: any) => {
        userIds.add(msg.sender_id);
        userIds.add(msg.receiver_id);
      });

      // Fetch usernames separately
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', Array.from(userIds));

      const usernameMap = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        usernameMap.set(p.id, p.username || 'Anonymous');
      });

      const mapped = (data || []).map((msg: any) => ({
        id: msg.id,
        listingId: msg.listing_id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        senderName: usernameMap.get(msg.sender_id) || 'Anonymous',
        content: msg.content,
        read: msg.read,
        createdAt: new Date(msg.created_at),
      }));

      setMessages(mapped);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send a message
  const sendMessage = useCallback(async (
    targetListingId: string,
    receiverId: string,
    content: string
  ) => {
    if (!user || !content.trim()) return false;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          listing_id: targetListingId,
          sender_id: user.id,
          receiver_id: receiverId,
          content: content.trim(),
        });

      if (error) throw error;

      await fetchMessages(targetListingId);
      return true;
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
      return false;
    }
  }, [user, fetchMessages]);

  // Mark messages as read (silent - no error toasts)
  const markAsRead = useCallback(async (targetListingId: string) => {
    if (!user) return false;

    try {
      // First check if there are unread rows
      const { count: unreadCount, error: countError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('listing_id', targetListingId)
        .eq('receiver_id', user.id)
        .eq('read', false);

      if (countError) {
        console.warn('Unable to pre-check unread count:', countError);
      }

      // No unread rows - just update local state silently
      if ((unreadCount ?? 0) === 0) {
        setMessages((prev) => prev.map((msg) =>
          msg.receiverId === user.id ? { ...msg, read: true } : msg
        ));
        setConversations((prev) => prev.map((conv) =>
          conv.listingId === targetListingId ? { ...conv, unreadCount: 0 } : conv
        ));
        return true;
      }

      // Try to update - silent on failure (RLS issues are common)
      const { data: updatedRows, error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('listing_id', targetListingId)
        .eq('receiver_id', user.id)
        .eq('read', false)
        .select('id');

      if (error) {
        console.warn('markAsRead failed (likely RLS):', error.message);
        return false;
      }

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.receiverId === user.id ? { ...msg, read: true } : msg
      ));
      setConversations(prev => prev.map(conv => 
        conv.listingId === targetListingId ? { ...conv, unreadCount: 0 } : conv
      ));
      return true;
    } catch (error) {
      console.warn('markAsRead exception:', error);
      return false;
    }
  }, [user]);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Get all messages involving the user (without nested relations)
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
        setConversations([]);
        return;
      }

      // Collect unique listing IDs and user IDs
      const listingIds = new Set<string>();
      const userIds = new Set<string>();

      messagesData.forEach((msg: any) => {
        listingIds.add(msg.listing_id);
        userIds.add(msg.sender_id);
        userIds.add(msg.receiver_id);
      });

      // Fetch listings
      const { data: listings } = await supabase
        .from('marketplace_listings')
        .select('*')
        .in('id', Array.from(listingIds));

      const listingMap = new Map<string, any>();
      (listings || []).forEach((l: any) => listingMap.set(l.id, l));

      // Fetch usernames
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', Array.from(userIds));

      const usernameMap = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        usernameMap.set(p.id, p.username || 'Anonymous');
      });

      // Group by listing and get last message
      const conversationMap = new Map<string, Conversation>();

      messagesData.forEach((msg: any) => {
        const listingId = msg.listing_id;
        const listing = listingMap.get(listingId);
        
        if (!conversationMap.has(listingId) && listing) {
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          const otherUserName = usernameMap.get(otherUserId) || 'Anonymous';

          conversationMap.set(listingId, {
            listingId,
            listing: {
              id: listing.id,
              sellerId: listing.seller_id,
              title: listing.title,
              imageUrl: listing.image_url,
              category: listing.category,
              pricePoints: listing.price_points,
              status: listing.status,
              createdAt: new Date(listing.created_at),
              updatedAt: new Date(listing.updated_at),
            },
            otherUserId,
            otherUserName,
            lastMessage: {
              id: msg.id,
              listingId: msg.listing_id,
              senderId: msg.sender_id,
              receiverId: msg.receiver_id,
              content: msg.content,
              read: msg.read,
              createdAt: new Date(msg.created_at),
            },
            unreadCount: 0,
          });
        }
      });

      // Count unread messages
      messagesData.forEach((msg: any) => {
        if (msg.receiver_id === user.id && !msg.read) {
          const conv = conversationMap.get(msg.listing_id);
          if (conv) {
            conv.unreadCount++;
          }
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to load conversations');
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscribe to new messages for a listing
  useEffect(() => {
    if (!user || !listingId) return;

    fetchMessages(listingId);

    const channel = supabase
      .channel(`messages:${listingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          // Show toast for new message if not from current user
          if (payload.new && (payload.new as any).sender_id !== user.id) {
            toast.info('New message received');
          }
          fetchMessages(listingId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, listingId, fetchMessages]);

  return {
    messages,
    conversations,
    loading,
    error,
    sendMessage,
    markAsRead,
    fetchMessages,
    fetchConversations,
  };
};
