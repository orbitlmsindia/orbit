-- ── CERTIFICATE COURSE SCHEMA MIGRATION ──
-- Extends courses table with standard certificate course fields, assessment break-up, modules, & passing rules.
-- All columns are nullable with NO defaults so instructors fill in course-specific data.

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_domain TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_status TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_language TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_level TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_type TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS intended_audience TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration_hours INTEGER;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS enrollment_end_date DATE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS exam_date DATE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS exam_reg_end_date DATE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS books_references JSONB;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS syllabus_modules JSONB;

-- Assessment Break-up and Passing Criteria
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS assessment_internal_marks INTEGER;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS assessment_external_marks INTEGER;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS assessment_total_marks INTEGER;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS min_pass_internal_pct INTEGER;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS min_pass_internal_marks INTEGER;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS min_pass_external_pct INTEGER;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS min_pass_external_marks INTEGER;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS min_pass_total_pct INTEGER;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS min_pass_total_marks INTEGER;

-- Instructor Biography & Organization Details
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_name TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_designation TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_department TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_photo_url TEXT;

NOTIFY pgrst, 'reload schema';
