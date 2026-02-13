
-- FIX PERMISSION DENIED (42501) ON TABLE USERS - CORRECTED
-- Run this in Supabase SQL Editor.

-- 1. Explicitly Grant SELECT permission on 'users' to authenticated users
-- This is often required even if RLS policies exist.
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon; -- Optional, if needed for login checks

-- 2. Ensure RLS Policy allows reading
-- This policy allows any logged-in user to read user profiles (necessary for role checks)
DROP POLICY IF EXISTS "View users" ON public.users;
CREATE POLICY "View users" 
ON public.users 
FOR SELECT 
USING ( auth.role() = 'authenticated' );

-- 3. Just in case: Grant permissions on daily_quotes
GRANT ALL ON daily_quotes TO authenticated;
GRANT ALL ON daily_quotes TO service_role;

-- 4. Re-enable the simple insert policy for daily_quotes (Standard RLS)
-- This works if step 1 & 2 are successful.
DROP POLICY IF EXISTS "Enable insert for teachers and admins" ON daily_quotes;
CREATE POLICY "Enable insert for teachers and admins" 
ON daily_quotes FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('teacher', 'admin')
    )
);
