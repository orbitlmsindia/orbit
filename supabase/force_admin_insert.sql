-- EMERGENCY FIX: FORCE ADMIN INSERT (CORRECTED)
-- The previous error was because 'super_admin' is not a valid enum value for user_role.
-- We only check for 'admin'.

-- 1. DROP ALL restrictive policies on courses
DROP POLICY IF EXISTS "Admin manage courses" ON public.courses;
DROP POLICY IF EXISTS "Teacher manage own courses" ON public.courses;
DROP POLICY IF EXISTS "View published courses" ON public.courses;
DROP POLICY IF EXISTS "View courses list" ON public.courses;


-- 2. CREATE A 'DO EVERYTHING' POLICY FOR ADMINS
CREATE POLICY "Admin manage courses" ON public.courses
  FOR ALL
  USING (
    -- Direct role check avoiding helper functions
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- 3. RE-ADD TEACHER POLICY
CREATE POLICY "Teacher manage own courses" ON public.courses
  FOR ALL
  USING ( teacher_id = auth.uid() )
  WITH CHECK ( teacher_id = auth.uid() );
  
-- 4. VIEW POLICY (Public/Students)
CREATE POLICY "View published courses" ON public.courses
  FOR SELECT
  USING ( is_published = true );
  
-- 5. VIEW LIST (Admins and Teachers need to see unpublished courses)
CREATE POLICY "View courses list" ON public.courses
  FOR SELECT
  USING ( 
     (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'teacher')
  );

NOTIFY pgrst, 'reload schema';
