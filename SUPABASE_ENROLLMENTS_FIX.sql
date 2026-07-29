-- FIX FOR ENROLLMENTS (403 Forbidden on POST)
-- Run this script in your Supabase SQL Editor

-- 1. Allow Students to INSERT into enrollments (Enroll in a course)
DROP POLICY IF EXISTS "student_insert_enrollment" ON enrollments;
CREATE POLICY "student_insert_enrollment" ON enrollments
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = student_id);

-- 2. Allow Admins to INSERT enrollments (if needed from dashboard)
DROP POLICY IF EXISTS "admin_insert_enrollment" ON enrollments;
CREATE POLICY "admin_insert_enrollment" ON enrollments
  FOR INSERT 
  TO authenticated 
  WITH CHECK (public.is_admin_user());

-- 3. Allow Admins to UPDATE/DELETE enrollments
DROP POLICY IF EXISTS "admin_update_enrollment" ON enrollments;
CREATE POLICY "admin_update_enrollment" ON enrollments
  FOR UPDATE 
  TO authenticated 
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "admin_delete_enrollment" ON enrollments;
CREATE POLICY "admin_delete_enrollment" ON enrollments
  FOR DELETE 
  TO authenticated 
  USING (public.is_admin_user());
