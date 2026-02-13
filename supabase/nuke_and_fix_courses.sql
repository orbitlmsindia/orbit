-- EMERGENCY SUPER FIX
-- The RLS error persists. This is likely because specific Institute-based policies from other scripts are still active or conflicting.
-- We will now NUKE all RLS on 'courses' to prove it works, then re-apply a single verified policy.

-- 1. DISABLE RLS TEMPORARILY
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Admin manage courses" ON public.courses;
DROP POLICY IF EXISTS "Teacher manage own courses" ON public.courses;
DROP POLICY IF EXISTS "View published courses" ON public.courses;
DROP POLICY IF EXISTS "View courses list" ON public.courses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can select courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can select published courses" ON public.courses;

-- 3. RE-ENABLE RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- 4. CREATE ONE SINGLE ADMIN POLICY (No helper functions, direct Auth ID check)
-- This assumes you are the Admin. Run this query to get your ID: SELECT auth.uid();
-- Or better, we trust the role check.

CREATE POLICY "Super Policy" ON public.courses
  FOR ALL
  USING (
    -- 1. If I am Admin, I can do anything
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    OR 
    -- 2. If I am Teacher, I can manage my own (id)
    teacher_id = auth.uid()
    OR
    -- 3. Everyone can view published
    (is_published = true AND auth.role() = 'authenticated')
  )
  WITH CHECK (
    -- WRITE PERMISSIONS
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    OR
    teacher_id = auth.uid()
  );

NOTIFY pgrst, 'reload schema';
