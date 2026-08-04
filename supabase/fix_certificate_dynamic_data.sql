-- ── FIX: RESET CERTIFICATE COURSE FIELDS TO NULL ──
-- The previous migration set DEFAULT values for ALL certificate fields,
-- which caused every course to display the same AI/ML data.
-- This migration:
--   1. Removes the DEFAULT values from columns so new courses start empty
--   2. Sets existing courses' certificate fields to NULL so instructors can fill in their own data

-- Step 1: Remove DEFAULT values from all certificate-specific columns
ALTER TABLE public.courses ALTER COLUMN course_domain DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN course_status DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN course_language DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN course_level DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN course_type DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN intended_audience DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN duration_hours DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN start_date DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN end_date DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN enrollment_end_date DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN exam_date DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN exam_reg_end_date DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN books_references DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN syllabus_modules DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN assessment_internal_marks DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN assessment_external_marks DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN assessment_total_marks DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN min_pass_internal_pct DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN min_pass_internal_marks DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN min_pass_external_pct DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN min_pass_external_marks DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN min_pass_total_pct DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN min_pass_total_marks DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN instructor_name DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN instructor_designation DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN instructor_department DROP DEFAULT;
ALTER TABLE public.courses ALTER COLUMN instructor_photo_url DROP DEFAULT;

-- Step 2: Reset ALL existing courses' certificate fields to NULL
-- This ensures each instructor fills in course-specific data
UPDATE public.courses SET
    course_domain = NULL,
    course_status = NULL,
    course_language = NULL,
    course_level = NULL,
    course_type = NULL,
    intended_audience = NULL,
    duration_hours = NULL,
    start_date = NULL,
    end_date = NULL,
    enrollment_end_date = NULL,
    exam_date = NULL,
    exam_reg_end_date = NULL,
    books_references = NULL,
    syllabus_modules = NULL,
    assessment_internal_marks = NULL,
    assessment_external_marks = NULL,
    assessment_total_marks = NULL,
    min_pass_internal_pct = NULL,
    min_pass_internal_marks = NULL,
    min_pass_external_pct = NULL,
    min_pass_external_marks = NULL,
    min_pass_total_pct = NULL,
    min_pass_total_marks = NULL,
    instructor_name = NULL,
    instructor_designation = NULL,
    instructor_department = NULL,
    instructor_photo_url = NULL;

NOTIFY pgrst, 'reload schema';
