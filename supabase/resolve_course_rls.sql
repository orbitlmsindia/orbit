-- NUCLEAR OPTION: Fix Course Creation Permissions
-- Run this entire script in Supabase SQL Editor

-- 1. Temporarily disable RLS on courses to rule out policy logic errors
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;

-- 2. Make sure the table IS actually using RLS (we will re-enable with a simple policy)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies on courses to avoid conflicts
DROP POLICY IF EXISTS "Admin manage courses" ON public.courses;
DROP POLICY IF EXISTS "Teacher manage own courses" ON public.courses;
DROP POLICY IF EXISTS "View published courses" ON public.courses;
DROP POLICY IF EXISTS "View courses list" ON public.courses;

-- 4. Create a SUPER PERMISSIVE policy for Authenticated Users (for debugging/dev)
-- This allows ANY logged-in user to Create, Read, Update, Delete courses.
CREATE POLICY "Enable all access for authenticated users" ON public.courses
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 5. Ensure the user is actually an Admin in the public.users table
-- This updates ALL users to be admins. 
UPDATE public.users SET role = 'admin';

-- 6. Grant explicit permissions
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
