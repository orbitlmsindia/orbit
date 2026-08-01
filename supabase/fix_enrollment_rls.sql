-- SQL Migration Script to fix Enrollment Verification & Approvals for Teachers

-- 1. Enable RLS on enrollments table (should be enabled already)
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies for teachers on enrollments
DROP POLICY IF EXISTS "Teacher view enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teacher manage enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teacher update/delete enrollments for their courses" ON public.enrollments;

-- 3. Create a unified policy for Teachers to manage enrollments of their courses
-- This allows teachers to SELECT, UPDATE (approve/decline), and DELETE student enrollments for their courses
CREATE POLICY "Teacher manage enrollments for their courses" ON public.enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = enrollments.course_id 
      AND courses.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
