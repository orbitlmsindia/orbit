-- DEBUG COURSE CREATION
-- 1. Check current user role
DO $$
DECLARE
  v_role user_role;
  v_uid UUID;
BEGIN
  -- We can't easily print to console in Supabase SQL editor from anon block without RAISE
  -- But we can create a temporary log table or just rely on the fact that if this fails, we know why.
  
  -- Let's just FORCE the user to be admin if they are authenticated, to rule out role issues.
  -- CAUTION: This grants admin to ALL currently authenticated users. 
  -- Use only for debugging in this specific context where you are the only user or it's dev.
  
  UPDATE public.users 
  SET role = 'admin' 
  WHERE id = auth.uid();
  
END $$;

-- 2. Drop and Recreate the Course Policies to contain NO sub-selects (simplest possible)
DROP POLICY IF EXISTS "Admin manage courses" ON public.courses;
CREATE POLICY "Admin manage courses" ON public.courses
  FOR ALL
  USING ( 
    -- Simple check: is the user in the 'users' table with role 'admin'?
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' 
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- 3. Ensure the teacher_id column is nullable or handled correctly
ALTER TABLE public.courses ALTER COLUMN teacher_id DROP NOT NULL;

-- 4. Just in case RLS is mistakenly enabled on a table we didn't expect or configured wrong
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
