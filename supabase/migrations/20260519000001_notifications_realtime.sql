-- Enable full row tracking so Realtime can deliver old/new row values
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add notifications to the Supabase Realtime publication
-- Without this, postgres_changes subscriptions on this table never fire
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
