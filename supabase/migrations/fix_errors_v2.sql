-- 1. Fix User Role Enum: Add 'master_admin'
-- This was causing the "invalid input value for enum user_role" error
DO $$
BEGIN
    ALTER TYPE user_role ADD VALUE 'master_admin';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Fix Assignments Enum: Add 'assignment' if missing
DO $$
BEGIN
    ALTER TYPE assignment_type ADD VALUE 'assignment';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Fix Notifications Constraints
-- Allow new types (Reminder, Alert, Event, Announcement)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
    CHECK (notification_type IN ('general', 'course', 'deadline', 'assignment', 'quiz', 'module', 'announcement', 'reminder', 'alert', 'event'));

-- Allow 'master_admin' as sender_role
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_sender_role_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_sender_role_check 
    CHECK (sender_role IN ('teacher', 'admin', 'master_admin', 'system'));

-- 4. Fix Users RLS: Allow authenticated users to read profile data (CRITICAL for role checks)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON users;
CREATE POLICY "Allow read access for authenticated users" ON users FOR SELECT TO authenticated USING (true);

-- 5. Fix Daily Quotes Policy: Use public.users instead of auth.users
DROP POLICY IF EXISTS "Enable insert for teachers and admins" ON daily_quotes;
CREATE POLICY "Enable insert for teachers and admins" ON daily_quotes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'master_admin'))
);

-- 6. Fix Calendar Events Policy: Use public.users instead of auth.users
DROP POLICY IF EXISTS "Enable write access for admins and teachers" ON calendar_events;
CREATE POLICY "Enable write access for admins and teachers" ON calendar_events FOR INSERT WITH CHECK (
    (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'master_admin')))
    OR
    (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
        AND (
            visibility = 'course' OR visibility = 'teachers' OR visibility = 'all'
        )
    )
);
