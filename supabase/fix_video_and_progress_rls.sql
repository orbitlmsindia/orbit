-- ============================================================
-- FIX: Section Progress RLS & Minimum Video Watch Percentage Column
-- ============================================================

-- 1. Enable RLS and add full manage policy for student's own progress
ALTER TABLE public.section_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own progress" ON public.section_progress;
DROP POLICY IF EXISTS "Students select own progress" ON public.section_progress;
DROP POLICY IF EXISTS "Students insert own progress" ON public.section_progress;
DROP POLICY IF EXISTS "Students update own progress" ON public.section_progress;
DROP POLICY IF EXISTS "Teachers view student progress" ON public.section_progress;

-- Allow Students to insert, update, select, and delete their own progress
CREATE POLICY "Students manage own progress" ON public.section_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow Teachers to view progress for students in their courses
CREATE POLICY "Teachers view student progress" ON public.section_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.section_contents sc
      JOIN public.course_sections cs ON cs.id = sc.section_id
      JOIN public.courses c ON c.id = cs.course_id
      WHERE sc.id = section_progress.content_id
      AND c.teacher_id = auth.uid()
    )
  );

-- 2. Add min_watch_percent column to courses table (default 80%)
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS min_watch_percent INTEGER DEFAULT 80;

-- 3. Add min_watch_percent column to section_contents table for individual video overrides
ALTER TABLE public.section_contents 
ADD COLUMN IF NOT EXISTS min_watch_percent INTEGER DEFAULT NULL;

-- Reload schema
NOTIFY pgrst, 'reload schema';
