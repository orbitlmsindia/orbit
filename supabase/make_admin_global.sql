-- GRANT GLOBAL ACCESS TO ADMINS (Super Admin Mode)
-- This script removes the "Same Institute" restriction for Admins.
-- Admins will be able to View, Edit, and Delete data across ALL Institutes.

-- 1. USERS
DROP POLICY IF EXISTS "Admin manage all users" ON public.users;
CREATE POLICY "Admin manage all users" ON public.users
  FOR ALL USING (
    get_my_role() = 'admin'
    -- Removed: AND institute_id = get_my_institute_id()
  );

-- 2. COURSES
DROP POLICY IF EXISTS "Admin manage courses" ON public.courses;
CREATE POLICY "Admin manage courses" ON public.courses
  FOR ALL USING (
    get_my_role() = 'admin'
    -- Removed restriction to own institute
  );

-- 3. ENROLLMENTS
DROP POLICY IF EXISTS "Admin manage enrollments" ON public.enrollments;
CREATE POLICY "Admin manage enrollments" ON public.enrollments
  FOR ALL USING (
    get_my_role() = 'admin'
  );

-- 4. SECTIONS & CONTENT
-- We need to update the helper function or the policy directly.
-- Let's update the policy to be simple for admins.

DROP POLICY IF EXISTS "Manage sections (Admin/Teacher)" ON public.course_sections;
CREATE POLICY "Manage sections (Admin/Teacher)" ON public.course_sections
  FOR ALL USING (
    get_my_role() = 'admin' OR (
      -- Teacher logic (unchanged)
      EXISTS (SELECT 1 FROM courses WHERE id = course_sections.course_id AND teacher_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Manage contents (Admin/Teacher)" ON public.section_contents;
CREATE POLICY "Manage contents (Admin/Teacher)" ON public.section_contents
  FOR ALL USING (
     get_my_role() = 'admin' OR (
       -- Teacher logic (unchanged)
      EXISTS (
        SELECT 1 FROM course_sections 
        JOIN courses ON courses.id = course_sections.course_id 
        WHERE course_sections.id = section_contents.section_id 
        AND courses.teacher_id = auth.uid()
      )
     )
  );

-- 5. REFRESH
NOTIFY pgrst, 'reload schema';
