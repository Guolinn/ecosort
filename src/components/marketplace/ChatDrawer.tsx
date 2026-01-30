import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { MarketplaceListing } from '@/types/marketplace';
import { format } from 'date-fns';

interface ChatDrawerProps {
  listing: MarketplaceListing | null;
  isOpen: boolean;
  onClose: () => void;
  onRead?: () => void;
}

export const ChatDrawer = ({ listing, isOpen, onClose, onRead }: ChatDrawerProps) => {
  const { user } = useAuth();
  const { messages, sendMessage, markAsRead, loading } = useChat(listing?.id);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const receiverId = listing?.sellerId === user?.id 
    ? messages.find(m => m.senderId !== user?.id)?.senderId || ''
    : listing?.sellerId || '';

  // Mark as read when opening (silent)
  useEffect(() => {
    if (isOpen && listing) {
      markAsRead(listing.id).then(ok => {
        if (ok) onRead?.();
      });
    }
  }, [isOpen, listing, markAsRead, onRead]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!listing || !newMessage.trim() || !receiverId) return;
    
    setSending(true);
    await sendMessage(listing.id, receiverId, newMessage);
    setNewMessage('');
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!listing) return null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="h-[85vh] max-h-[85vh] flex flex-col">
        {/* Header */}
        <DrawerHeader className="flex-shrink-0 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-sm font-semibold truncate">{listing.title}</DrawerTitle>
              <p className="text-xs text-muted-foreground">{listing.pricePoints} pts</p>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ml-2 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DrawerHeader>

        {/* Messages - fixed height, scrollable */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4" ref={scrollRef}>
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                        isOwn 
                          ? 'bg-primary text-primary-foreground rounded-br-sm' 
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}>
                        <p className="text-sm break-words">{msg.content}</p>
                        <p className={`text-[10px] mt-0.5 ${
                          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {format(msg.createdAt, 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Input - stays at bottom, keyboard pushes it up naturally */}
        <div className="flex-shrink-0 p-3 border-t border-border bg-background">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={sending || !receiverId}
              className="flex-1 h-10 text-base"
              style={{ fontSize: '16px' }}
            />
            <button 
              onClick={handleSend} 
              disabled={!newMessage.trim() || sending || !receiverId}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {!receiverId && messages.length === 0 && listing.sellerId !== user?.id && (
            <p className="text-xs text-muted-foreground mt-2">
              Send a message to the seller
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
