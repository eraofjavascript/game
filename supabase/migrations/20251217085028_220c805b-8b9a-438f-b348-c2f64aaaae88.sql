-- Add message_type column for system messages
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'user' CHECK (message_type IN ('user', 'system'));

-- Create function to send join message when profile is created
CREATE OR REPLACE FUNCTION public.send_join_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_messages (content, sender_id, is_group_message, message_type)
  VALUES (
    NEW.username || ' joined the chat',
    NEW.id,
    true,
    'system'
  );
  RETURN NEW;
END;
$$;

-- Create trigger to fire after profile insert
DROP TRIGGER IF EXISTS on_profile_created_send_join ON public.profiles;
CREATE TRIGGER on_profile_created_send_join
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_join_message();

-- Enable realtime for profiles table
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
