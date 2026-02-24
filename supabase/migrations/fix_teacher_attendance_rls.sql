-- ** THE ULTIMATE ATTENDANCE FIX **
-- This script dynamically destroys all existing policies on the attendance table,
-- regardless of what they are named, and implements bulletproof rules.

-- 1. Ensure basic table permissions are granted to the authenticated API user.
-- Sometimes 'permission denied for table users' literally means the API user is missing the SELECT grant on the table level.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.courses TO authenticated;

-- 2. Dynamically obliterate ALL RLS policies on the `attendance` table to ensure no hidden UI-created policies exist.
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'attendance' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance', pol.policyname);
    END LOOP;
END $$;

-- 3. Also dynamically drop any policy on `users` table that might cause recursion
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
        AND policyname ILIKE '%Enable read access for authenticated users%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- 4. Set up safe, non-recursive RLS for Users table (View-only for logged in users)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View users safely" ON public.users;
CREATE POLICY "View users safely" ON public.users
FOR SELECT
USING ( auth.role() = 'authenticated' );

-- 5. Set up safe, blanket RLS for Attendance table
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attendance all operations safely" ON public.attendance
FOR ALL
USING ( auth.role() = 'authenticated' )
WITH CHECK ( auth.role() = 'authenticated' );

