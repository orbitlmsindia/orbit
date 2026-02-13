-- COMPREHENSIVE FIX FOR PERMISSION ERRORS
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Fix Users Table Read Access (Critical for all role checks)
DROP POLICY IF EXISTS "Allow individual read access" ON public.users;
CREATE POLICY "Allow individual read access" 
ON public.users FOR SELECT 
TO authenticated 
USING ( auth.uid() = id );

-- 2. Fix Daily Quotes Table Access
-- Allow authenticated users (Admins) to INSERT and SELECT
DROP POLICY IF EXISTS "Allow authenticated insert quotes" ON public.daily_quotes;
CREATE POLICY "Allow authenticated insert quotes"
ON public.daily_quotes FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated select quotes" ON public.daily_quotes;
CREATE POLICY "Allow authenticated select quotes"
ON public.daily_quotes FOR SELECT
TO authenticated
USING (true);

-- 3. Fix Calendar Events Table Access
-- Allow authenticated users (Admins) to INSERT and SELECT
DROP POLICY IF EXISTS "Allow authenticated insert events" ON public.calendar_events;
CREATE POLICY "Allow authenticated insert events"
ON public.calendar_events FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated select events" ON public.calendar_events;
CREATE POLICY "Allow authenticated select events"
ON public.calendar_events FOR SELECT
TO authenticated
USING (true);

-- 4. Enable RLS but ensure policies exist
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- 5. Grant usage permissions
GRANT ALL ON public.daily_quotes TO authenticated;
GRANT ALL ON public.calendar_events TO authenticated;
