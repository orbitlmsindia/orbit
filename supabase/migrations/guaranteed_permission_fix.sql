
-- GUARANTEED PERMISSION FIX (Supabase RLS)
-- Run this script to fix the 'permission denied for table users' error once and for all.

BEGIN;

-------------------------------------------------------------------------------
-- 1. FIX 'users' TABLE PERMISSIONS (The Root Cause)
-------------------------------------------------------------------------------

-- Grant explicit SELECT permission to the authenticated role
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT SELECT ON TABLE public.users TO anon;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting 'select' policies
DROP POLICY IF EXISTS "Public Read Users" ON public.users;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "View users" ON public.users;

-- Create a generic read policy: "Authenticated users can read all user profiles"
-- This is standard for apps where you need to check roles/names of other users.
CREATE POLICY "Allow_Read_All_Users"
ON public.users
FOR SELECT
USING ( auth.role() = 'authenticated' );


-------------------------------------------------------------------------------
-- 2. FIX 'daily_quotes' TABLE POLICIES
-------------------------------------------------------------------------------

-- Grant permissions
GRANT ALL ON TABLE public.daily_quotes TO authenticated;
GRANT ALL ON TABLE public.daily_quotes TO service_role;

-- Enable RLS
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;

-- Create a Security Definer function to check roles safely
-- This bypasses RLS on 'users' just in case, acting as a backup.
CREATE OR REPLACE FUNCTION public.fn_is_teacher_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('teacher', 'admin')
  );
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Reset Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON daily_quotes;
DROP POLICY IF EXISTS "Enable insert for teachers and admins" ON daily_quotes;
DROP POLICY IF EXISTS "Enable update for creators and admins" ON daily_quotes;
DROP POLICY IF EXISTS "Enable delete for creators and admins" ON daily_quotes;

-- 1. READ: Everyone
CREATE POLICY "read_policy" ON daily_quotes FOR SELECT USING (true);

-- 2. INSERT: Teachers & Admins (using the secure function)
CREATE POLICY "insert_policy" 
ON daily_quotes 
FOR INSERT 
WITH CHECK ( public.fn_is_teacher_or_admin() );

-- 3. UPDATE: Creator or Admin
CREATE POLICY "update_policy" 
ON daily_quotes 
FOR UPDATE
USING ( created_by = auth.uid() OR public.fn_is_teacher_or_admin() );

-- 4. DELETE: Creator or Admin
CREATE POLICY "delete_policy" 
ON daily_quotes 
FOR DELETE
USING ( created_by = auth.uid() OR public.fn_is_teacher_or_admin() );

COMMIT;
