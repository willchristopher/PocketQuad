-- Enable RLS across all Prisma-managed tables in the exposed public schema.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    '_prisma_migrations',
    'ai_conversations',
    'ai_messages',
    'announcements',
    'building_manager_assignments',
    'calendar_events',
    'campus_buildings',
    'campus_resource_links',
    'campus_services',
    'channel_members',
    'channels',
    'chat_message_reports',
    'chat_messages',
    'club_manager_assignments',
    'club_organizations',
    'deadlines',
    'event_interests',
    'events',
    'faculty',
    'faculty_favorites',
    'notification_preferences',
    'notifications',
    'office_hour_queue',
    'office_hours',
    'quick_links',
    'message_reactions',
    'universities',
    'users'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- Prisma migration history should never be exposed through PostgREST.
REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM authenticated;

-- Helper functions let RLS policies reuse the app's Supabase user mapping
-- without exposing the users table directly.
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id
  FROM public.users
  WHERE supabase_id = auth.uid()::text
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS public."UserRole"
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role
  FROM public.users
  WHERE supabase_id = auth.uid()::text
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_channel_member(target_channel_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channel_members
    WHERE channel_id = target_channel_id
      AND user_id = public.current_app_user_id()
  )
$$;

-- Realtime subscriptions need explicit read policies once RLS is enabled.
DROP POLICY IF EXISTS "notifications_realtime_select" ON public.notifications;
CREATE POLICY "notifications_realtime_select"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = public.current_app_user_id());

DROP POLICY IF EXISTS "chat_messages_realtime_select" ON public.chat_messages;
CREATE POLICY "chat_messages_realtime_select"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (public.is_channel_member(channel_id));

DROP POLICY IF EXISTS "office_hour_queue_realtime_select" ON public.office_hour_queue;
CREATE POLICY "office_hour_queue_realtime_select"
ON public.office_hour_queue
FOR SELECT
TO authenticated
USING (
  student_id = public.current_app_user_id()
  OR public.current_app_role() IN (
    'FACULTY'::public."UserRole",
    'ADMIN'::public."UserRole"
  )
);
