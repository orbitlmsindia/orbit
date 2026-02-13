-- Remove Institute dependency and make it single-tenant (global admin)

-- 1. Remove institute_id from users
ALTER TABLE users DROP COLUMN IF EXISTS institute_id CASCADE;

-- 2. Remove institute_id from courses
ALTER TABLE courses DROP COLUMN IF EXISTS institute_id CASCADE;

-- 3. Remove institute_id from notifications
ALTER TABLE notifications DROP COLUMN IF EXISTS institute_id CASCADE;

-- 4. Drop institutes table
DROP TABLE IF EXISTS institutes CASCADE;

-- 5. Update Helper Functions to remove institute checks

-- A. Update fn_is_admin_of_institute -> fn_is_admin (simplified)
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM public.users
  WHERE id = auth.uid();
  
  IF v_role = 'admin' THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old function if it exists (cascade likely handled this, but just in case)
DROP FUNCTION IF EXISTS public.fn_is_admin_of_institute(UUID);


-- B. Update fn_can_manage_course
CREATE OR REPLACE FUNCTION public.fn_can_manage_course(_course_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_course_teacher UUID;
BEGIN
  SELECT role INTO v_user_role
  FROM public.users WHERE id = auth.uid();

  SELECT teacher_id INTO v_course_teacher
  FROM public.courses WHERE id = _course_id;

  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  ELSIF v_user_role = 'teacher' AND v_course_teacher = auth.uid() THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- C. Update fn_can_view_user (Now any authenticated user can view users? Or maybe just Admin/Teacher)
-- Let's say Admin can view all, Teacher can view students (maybe restricted later), Student only self
-- For simplicity in single-tenant, let's allow authenticated users to view users if needed for UI, or restrict to Admin.
-- The original policy "View users in institute" used this.
-- New policy: "View users"
DROP FUNCTION IF EXISTS public.fn_can_view_user(UUID);

-- D. Update fn_can_view_course (No more institute check)
DROP FUNCTION IF EXISTS public.fn_can_view_course(UUID);


-- 6. Update Policies

-- USERS
DROP POLICY IF EXISTS "Admin manage all users" ON users;
CREATE POLICY "Admin manage all users" ON users
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "View users in institute" ON users;
CREATE POLICY "View users" ON users
  FOR SELECT USING (auth.role() = 'authenticated'); -- Or restrict based on requirements

-- COURSES
DROP POLICY IF EXISTS "Admin manage courses" ON public.courses;
CREATE POLICY "Admin manage courses" ON public.courses
  FOR ALL
  USING ( (SELECT role FROM users WHERE id = auth.uid()) = 'admin' )
  WITH CHECK ( (SELECT role FROM users WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "View courses list" ON public.courses;
-- Authenticated users (students/teachers) can view published courses, or all if admin/teacher
CREATE POLICY "View courses list" ON public.courses
  FOR SELECT
  USING ( 
    is_published = true 
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher')
  );

-- NOTIFICATIONS
-- Drop policies constrained by institute_id
DROP POLICY IF EXISTS "Admin manage notifications" ON notifications; -- if existed
-- Create new simple policy for admin
CREATE POLICY "Admin manage notifications" ON notifications
  FOR ALL
  USING ( (SELECT role FROM users WHERE id = auth.uid()) = 'admin' );

-- TRIGGER for new user
-- Update handle_new_user to not require institute_id
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student') -- Default to student if not specified
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
