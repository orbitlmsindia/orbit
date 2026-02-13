-- FIX TEACHER ACCESS (Ensure Teachers can View/Edit their Courses)
-- Run this to guarantee that assigned teachers can see and manage their content.

-- 1. Enable Security
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_contents ENABLE ROW LEVEL SECURITY;

-- 2. COURSES: Teachers can view/edit courses assigned to them
DROP POLICY IF EXISTS "Teacher manage own courses" ON public.courses;
CREATE POLICY "Teacher manage own courses" ON public.courses
  FOR ALL
  USING ( teacher_id = auth.uid() )
  WITH CHECK ( teacher_id = auth.uid() );

-- 3. SECTIONS: Teachers can add/edit sections for their courses
-- We use a simple, robust check
DROP POLICY IF EXISTS "Teacher manage sections" ON public.course_sections;
CREATE POLICY "Teacher manage sections" ON public.course_sections
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_sections.course_id AND teacher_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND teacher_id = auth.uid())
  );

-- 4. CONTENT: Teachers can add/edit content
DROP POLICY IF EXISTS "Teacher manage contents" ON public.section_contents;
CREATE POLICY "Teacher manage contents" ON public.section_contents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.course_sections 
      JOIN public.courses ON courses.id = course_sections.course_id 
      WHERE course_sections.id = section_contents.section_id 
      AND courses.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_sections 
      JOIN public.courses ON courses.id = course_sections.course_id 
      WHERE course_sections.id = section_id 
      AND courses.teacher_id = auth.uid()
    )
  );
  
-- 5. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
