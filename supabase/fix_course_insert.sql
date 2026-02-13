-- FIX: Admin Course Creation RLS
-- The error "new row violates row-level security policy for table courses" means
-- the INSERT policy for `courses` is too strict. 
-- It likely checks if the Admin belongs to the SAME institute as the course they are creating.
-- BUT, we just allowed Global Admins to create courses for ANY institute.

-- 1. DROP RESTRICTIVE CREATE POLICY
DROP POLICY IF EXISTS "Admin manage courses" ON public.courses;

-- 2. CREATE PERMISSIVE POLICY FOR ADMINS
-- "Admins can Insert/Update/Delete ANY course"
CREATE POLICY "Admin manage courses" ON public.courses
  FOR ALL
  USING (
     -- Allow if user is admin
     get_my_role() = 'admin'
     -- OR if user is teacher and owns the course (for edits)
     OR (teacher_id = auth.uid())
  )
  WITH CHECK (
     -- Allow if user is admin (can create for any institute)
     get_my_role() = 'admin'
     -- OR if user is teacher creating for themselves (if allowed)
     OR (teacher_id = auth.uid())
  );

-- 3. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
