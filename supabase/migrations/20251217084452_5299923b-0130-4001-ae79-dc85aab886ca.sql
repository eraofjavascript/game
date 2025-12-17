-- Enable realtime for chat messages
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Add table to realtime publication (safe if already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
