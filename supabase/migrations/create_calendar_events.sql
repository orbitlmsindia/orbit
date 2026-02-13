-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    type TEXT CHECK (type IN ('event', 'holiday', 'deadline', 'announcement')) DEFAULT 'event',
    visibility TEXT CHECK (visibility IN ('all', 'teachers', 'students', 'course')) DEFAULT 'all',
    course_id UUID REFERENCES courses(id), -- Only if visibility = 'course'
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Read Policy
CREATE POLICY "Enable read access based on visibility" ON calendar_events FOR SELECT USING (
    -- Admin/Master Admin sees everything
    (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role IN ('admin', 'master_admin')))
    OR
    -- Teachers see 'all', 'teachers', 'course' (if they teach it)
    (
        EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'teacher')
        AND (
            visibility IN ('all', 'teachers') 
            OR (visibility = 'course' AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid()))
        )
    )
    OR
    -- Students see 'all', 'students', 'course' (if enrolled)
    (
        EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'student')
        AND (
            visibility IN ('all', 'students') 
            OR (visibility = 'course' AND course_id IN (SELECT course_id FROM enrollments WHERE student_id = auth.uid()))
        )
    )
);

-- 2. Write Policy
CREATE POLICY "Enable write access for admins and teachers" ON calendar_events FOR INSERT WITH CHECK (
    -- Admin/Master Admin can create any event
    (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role IN ('admin', 'master_admin')))
    OR
    -- Teachers can create events for their courses
    (
        EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'teacher')
        AND (
            -- If creating general event, maybe restrict to only course events?
            -- Let's say teachers can only create course events for now.
            (visibility = 'course' AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid()))
        )
    )
);

-- Note: Update/Delete policies omitted for brevity but should mirror Insert.
