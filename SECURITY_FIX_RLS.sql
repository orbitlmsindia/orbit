-- SECURITY FIX: Restrict Unauthenticated Access & Enforce RLS
-- Run this in your Supabase SQL Editor

-- 1. Enable RLS on core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Handle 'invoices' and 'audit_logs' dynamically just in case they don't exist in the current schema
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        EXECUTE 'ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;';
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        EXECUTE 'ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;';
    END IF;
END $$;

-- 2. Drop any existing permissive policies (like those from previous debug scripts)
DROP POLICY IF EXISTS "Allow All for Authenticated" ON users;
DROP POLICY IF EXISTS "View users" ON users;
DROP POLICY IF EXISTS "users_own_row" ON users;
DROP POLICY IF EXISTS "admin_view_all_users" ON users;

-- 3. Create strictly scoped policies for USERS
-- A. Users can only see their own data
CREATE POLICY "users_own_row" ON users
  FOR SELECT USING (auth.uid() = id);

-- B. Admins can see all users (crucial so the Admin Dashboard doesn't break)
-- Helper function to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role::TEXT INTO user_role FROM public.users WHERE id = auth.uid();
  RETURN user_role = 'admin';
END;
$$;

CREATE POLICY "admin_view_all_users" ON users
  FOR SELECT USING (public.is_admin_user());

-- 4. Create strictly scoped policies for ENROLLMENTS
DROP POLICY IF EXISTS "enrollments_own" ON enrollments;
DROP POLICY IF EXISTS "Student view own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Teacher view enrollments" ON enrollments;
DROP POLICY IF EXISTS "admin_view_all_enrollments" ON enrollments;

-- A. Students see their own enrollments (NOTE: using student_id instead of user_id based on your schema)
CREATE POLICY "enrollments_own" ON enrollments
  FOR SELECT USING (auth.uid() = student_id);

-- B. Teachers see enrollments for their own courses
CREATE POLICY "Teacher view enrollments" ON enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses WHERE id = enrollments.course_id AND teacher_id = auth.uid())
  );

-- C. Admins see all enrollments
CREATE POLICY "admin_view_all_enrollments" ON enrollments
  FOR SELECT USING (public.is_admin_user());
