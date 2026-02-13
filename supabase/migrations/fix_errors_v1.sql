-- 1. Fix Assignments Enum: Add 'assignment' if missing
DO $$
BEGIN
    ALTER TYPE assignment_type ADD VALUE 'assignment';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Fix Notifications Constraints
-- Allow new types (Reminder, Alert, Event, Announcement)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
    CHECK (notification_type IN ('general', 'course', 'deadline', 'assignment', 'quiz', 'module', 'announcement', 'reminder', 'alert', 'event'));

-- Allow 'master_admin' as sender_role
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_sender_role_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_sender_role_check 
    CHECK (sender_role IN ('teacher', 'admin', 'master_admin', 'system'));

-- 3. Fix Users RLS: Allow authenticated users to read profile data (needed to check roles)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON users;
CREATE POLICY "Allow read access for authenticated users" ON users FOR SELECT TO authenticated USING (true);

-- 4. Fix Daily Quotes Policy: Use public.users instead of auth.users for role check
DROP POLICY IF EXISTS "Enable insert for teachers and admins" ON daily_quotes;
CREATE POLICY "Enable insert for teachers and admins" ON daily_quotes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'master_admin'))
);

-- 5. Fix Calendar Events Policy: Use public.users instead of auth.users for role check
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
