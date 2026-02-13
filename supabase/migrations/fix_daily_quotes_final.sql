
-- FIX 403 ERROR: Use Security Definer Function for Permissions
-- This bypasses RLS on the 'public.users' table to safely check roles.

-- 1. Create a secure function to check user role
CREATE OR REPLACE FUNCTION public.check_is_teacher_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres), bypassing RLS
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('teacher', 'admin')
  );
END;
$$;

-- 2. Create a secure function to check if user is admin
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- 3. Update Policies on daily_quotes to use these functions

-- Drop old policies
DROP POLICY IF EXISTS "Enable insert for teachers and admins" ON daily_quotes;
DROP POLICY IF EXISTS "Enable update for creators and admins" ON daily_quotes;
DROP POLICY IF EXISTS "Enable delete for creators and admins" ON daily_quotes;

-- Insert Policy
CREATE POLICY "Enable insert for teachers and admins" 
ON daily_quotes FOR INSERT 
WITH CHECK (
    public.check_is_teacher_or_admin()
);

-- Update Policy
CREATE POLICY "Enable update for creators and admins" 
ON daily_quotes FOR UPDATE
USING (
    created_by = auth.uid() 
    OR 
    public.check_is_admin()
);

-- Delete Policy
CREATE POLICY "Enable delete for creators and admins" 
ON daily_quotes FOR DELETE
USING (
    created_by = auth.uid() 
    OR 
    public.check_is_admin()
);

-- 4. Ensure public access (Read) remains
DROP POLICY IF EXISTS "Enable read access for all users" ON daily_quotes;
CREATE POLICY "Enable read access for all users" ON daily_quotes FOR SELECT USING (true);
