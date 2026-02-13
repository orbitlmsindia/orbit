-- DISABLE RLS COMPLETELY ON CONTENT TABLES
-- You requested to remove RLS security constraints to simply allow adding modules/content.
-- This script DISABLES RLS on 'course_sections' and 'section_contents'.

ALTER TABLE public.course_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_contents DISABLE ROW LEVEL SECURITY;

-- Just to be sure, allow everything even if RLS was somehow re-enabled
DROP POLICY IF EXISTS "Allow all on sections" ON public.course_sections;
CREATE POLICY "Allow all on sections" ON public.course_sections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on contents" ON public.section_contents;
CREATE POLICY "Allow all on contents" ON public.section_contents FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
