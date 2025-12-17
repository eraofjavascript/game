import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Send, Users, MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string | null;
  is_group_message: boolean;
  created_at: string;
  profiles: { username: string };
}

interface ChatPanelProps {
  isFullScreen?: boolean;
  onBack?: () => void;
}

const ChatPanel = ({ isFullScreen = false, onBack }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [members, setMembers] = useState<{ id: string; username: string }[]>([]);
  const [activeChat, setActiveChat] = useState<'group' | string>('group');
  const [showChatList, setShowChatList] = useState(true);
  const { user, profile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchMembers();
    fetchMessages();

    const channel = supabase
      .channel('chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new as any;
        if (
          newMsg.is_group_message ||
          newMsg.sender_id === user.id ||
          newMsg.receiver_id === user.id
        ) {
          fetchMessages();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .neq('id', user?.id);
    if (data) setMembers(data);
  };

  const fetchMessages = async () => {
    if (!user) return;

    let query = supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (activeChat === 'group') {
      query = query.eq('is_group_message', true);
    } else {
      query = query
        .eq('is_group_message', false)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChat}),and(sender_id.eq.${activeChat},receiver_id.eq.${user.id})`);
    }

    const { data } = await query;
    if (data) {
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', senderIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const messagesWithProfiles = data.map(m => ({
        ...m,
        profiles: profileMap.get(m.sender_id) || { username: 'Unknown' }
      }));
      setMessages(messagesWithProfiles as Message[]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    await supabase.from('chat_messages').insert({
      content: newMessage.trim(),
      sender_id: user.id,
      receiver_id: activeChat === 'group' ? null : activeChat,
      is_group_message: activeChat === 'group',
    });

    setNewMessage('');
  };

  const openChat = (chatId: 'group' | string) => {
    setActiveChat(chatId);
    setShowChatList(false);
  };

  const goBackToList = () => {
    setShowChatList(true);
  };

  const activeMember = members.find((m) => m.id === activeChat);

  // Chat List View
  const ChatListView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground">Chats</h2>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Group Chat */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => openChat('group')}
          className="w-full p-4 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors flex items-center gap-3 text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">Group Chat</p>
            <p className="text-sm text-muted-foreground truncate">
              {members.length + 1} members
            </p>
          </div>
        </motion.button>

        {/* Individual Members */}
        {members.map((member) => (
          <motion.button
            key={member.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => openChat(member.id)}
            className="w-full p-4 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-colors flex items-center gap-3 text-left"
          >
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-accent/20 text-accent">
                {member.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{member.username}</p>
              <p className="text-sm text-muted-foreground">Direct message</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );

  // Chat Messages View
  const ChatMessagesView = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBackToList}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          {activeChat === 'group' ? (
            <Users className="w-5 h-5 text-primary" />
          ) : (
            <Avatar className="w-full h-full">
              <AvatarFallback className="bg-accent/20 text-accent text-sm">
                {activeMember?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">
            {activeChat === 'group' ? 'Group Chat' : activeMember?.username}
          </h3>
          <p className="text-xs text-muted-foreground">
            {activeChat === 'group' ? `${members.length + 1} members` : 'Direct Message'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className={`text-xs ${isOwn ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
                    {msg.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className={`rounded-2xl px-4 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {!isOwn && (
                    <p className="text-xs font-medium mb-1 text-accent">
                      {msg.profiles?.username}
                    </p>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input */}
      <div className="p-4 pb-6">
        <div className="flex gap-2 p-2 rounded-2xl bg-secondary/80 backdrop-blur-sm border border-border">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            size="icon"
            className="bg-primary hover:bg-primary/90 rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={`${isFullScreen ? 'h-full' : 'h-[600px]'} bg-card flex flex-col overflow-hidden`}>
      <AnimatePresence mode="wait">
        {showChatList ? <ChatListView key="list" /> : <ChatMessagesView key="messages" />}
      </AnimatePresence>
    </div>
  );
};

export default ChatPanel;