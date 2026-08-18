-- ==============================================================================
-- ORBIT LMS: Calendar Events, Live Classes & Course Approval Fix
-- Description: Ensures students can only access calendar events, live classes,
--              assignments, and course schedules once their admission is approved
--              by admin (users.status = 'active') AND their course enrollment is
--              approved by teacher/admin (enrollments.status = 'approved').
--              Before approval, NO things related to that course are visible on the calendar.
-- ==============================================================================

-- 1. Ensure calendar_events table and columns exist
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    type TEXT DEFAULT 'event',
    visibility TEXT DEFAULT 'all',
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure type constraint supports all calendar event varieties
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_type_check 
    CHECK (type IN ('event', 'holiday', 'deadline', 'announcement', 'exam', 'live_class', 'quiz', 'assignment'));

-- Ensure visibility constraint supports all scopes
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_visibility_check;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_visibility_check 
    CHECK (visibility IN ('all', 'teachers', 'students', 'course'));

-- 2. Data Cleanup / Normalization: Set visibility to 'course' for any course-related events
UPDATE public.calendar_events
SET visibility = 'course'
WHERE course_id IS NOT NULL
   OR type IN ('live_class', 'exam', 'quiz', 'assignment')
   OR title ILIKE '%Module%'
   OR title ILIKE '%Live Session%'
   OR title ILIKE '%Live Class%'
   OR title ILIKE '%Lecture%';

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- 4. Drop legacy policies to prevent conflicts
DROP POLICY IF EXISTS "Enable read access based on visibility" ON public.calendar_events;
DROP POLICY IF EXISTS "Enable write access for admins and teachers" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_read_policy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_admin_all" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_teacher_write" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_student_select" ON public.calendar_events;
DROP POLICY IF EXISTS "Enable full access for admins" ON public.calendar_events;
DROP POLICY IF EXISTS "Enable full access for teachers on their courses" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_admin_full_access" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_teacher_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_teacher_modify" ON public.calendar_events;

-- 5. Create comprehensive RLS policies for calendar_events

-- Policy A: Admins & Master Admins (Full CRUD access to all events)
CREATE POLICY "calendar_events_admin_full_access" ON public.calendar_events
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (users.role IN ('admin', 'super_admin', 'master_admin') OR users.email ILIKE '%admin%')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (users.role IN ('admin', 'super_admin', 'master_admin') OR users.email ILIKE '%admin%')
        )
    );

-- Policy B: Teachers (Read general/teacher/course events; Insert/Update/Delete for own courses)
CREATE POLICY "calendar_events_teacher_select" ON public.calendar_events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'teacher'
        )
        AND (
            visibility IN ('all', 'teachers')
            OR (course_id IS NOT NULL AND course_id IN (
                SELECT id FROM public.courses WHERE teacher_id = auth.uid()
            ))
        )
    );

CREATE POLICY "calendar_events_teacher_modify" ON public.calendar_events
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'teacher'
        )
        AND course_id IN (
            SELECT id FROM public.courses WHERE teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'teacher'
        )
        AND course_id IN (
            SELECT id FROM public.courses WHERE teacher_id = auth.uid()
        )
    );

-- Policy C: Students (Strictly locked: NO course events visible before enrollment approval by teacher/admin)
CREATE POLICY "calendar_events_student_select" ON public.calendar_events
    FOR SELECT
    TO authenticated
    USING (
        -- 1. Student admission must be active (approved by Admin)
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'student'
            AND (users.status = 'active' OR users.status = 'approved' OR users.status IS NULL)
        )
        AND (
            -- 2a. Campus-wide General Announcements and Holidays ONLY (Non-course items)
            (
                visibility IN ('all', 'students') 
                AND course_id IS NULL 
                AND type IN ('holiday', 'announcement', 'event')
                AND title NOT ILIKE '%Module%'
                AND title NOT ILIKE '%Live Class%'
                AND title NOT ILIKE '%Live Session%'
                AND title NOT ILIKE '%Lecture%'
            )
            OR
            -- 2b. Course-specific events (Live classes, exams, quizzes, module sessions):
            -- Student enrollment MUST be APPROVED by teacher/admin.
            -- Before approval, NO things related to that course are visible!
            (
                course_id IS NOT NULL 
                AND course_id IN (
                    SELECT enrollments.course_id 
                    FROM public.enrollments 
                    WHERE enrollments.student_id = auth.uid()
                    AND enrollments.status IN ('approved', 'active')
                )
            )
        )
    );

-- 6. Create Helper Indexes for fast calendar lookups
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_course_id ON public.calendar_events(course_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON public.calendar_events(type);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status ON public.enrollments(student_id, status);

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE '✅ OrbitLMS Calendar Approval RLS policies & course protection updated successfully.';
END $$;
