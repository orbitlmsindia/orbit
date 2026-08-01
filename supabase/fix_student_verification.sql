-- ============================================================
-- FIX: Student Enrollment Verification & Approval Flow
-- ============================================================
-- This script consolidates all enrollment RLS policies to ensure:
--   1. Students can INSERT their own enrollment (with transaction_id)
--   2. Students can SELECT their own enrollments (to see pending/approved status)
--   3. Teachers can SELECT & UPDATE enrollments for their courses (approve/decline)
--   4. Admins can do everything on enrollments
-- ============================================================

-- Enable RLS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- ── CLEAN UP: Drop ALL existing enrollment policies to avoid conflicts ──
DROP POLICY IF EXISTS "enrollments_own" ON public.enrollments;
DROP POLICY IF EXISTS "Student view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "student_insert_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "admin_insert_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "admin_update_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "admin_delete_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "admin_view_all_enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin manage enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teacher view enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teacher manage enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teacher manage enrollments for their courses" ON public.enrollments;
DROP POLICY IF EXISTS "Teacher update/delete enrollments for their courses" ON public.enrollments;

-- ── 1. STUDENT: Can INSERT their own enrollment ──
CREATE POLICY "Students can enroll themselves"
  ON public.enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- ── 2. STUDENT: Can SELECT their own enrollments ──
CREATE POLICY "Students can view own enrollments"
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- ── 3. TEACHER: Can SELECT enrollments for their courses ──
CREATE POLICY "Teachers can view course enrollments"
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- ── 4. TEACHER: Can UPDATE enrollments for their courses (approve/decline) ──
CREATE POLICY "Teachers can update course enrollments"
  ON public.enrollments
  FOR UPDATE
  TO authenticated
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
      WHERE courses.id = enrollments.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- ── 5. TEACHER: Can DELETE enrollments for their courses ──
CREATE POLICY "Teachers can delete course enrollments"
  ON public.enrollments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- ── 6. ADMIN: Full access to all enrollments ──
CREATE POLICY "Admins manage all enrollments"
  ON public.enrollments
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- ── Reload PostgREST schema cache ──
NOTIFY pgrst, 'reload schema';
