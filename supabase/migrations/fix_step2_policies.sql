-- STEP 2: Apply Constraints and Policies
-- Run this file AFTER Step 1 is complete.

-- 3. Fix Notifications Constraints
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
    CHECK (notification_type IN ('general', 'course', 'deadline', 'assignment', 'quiz', 'module', 'announcement', 'reminder', 'alert', 'event'));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_sender_role_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_sender_role_check 
    CHECK (sender_role IN ('teacher', 'admin', 'master_admin', 'system'));

-- 4. Fix Users RLS (Allow authenticated users to read profile data)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON users;
CREATE POLICY "Allow read access for authenticated users" ON users FOR SELECT TO authenticated USING (true);

-- 5. Fix Daily Quotes Policy
DROP POLICY IF EXISTS "Enable insert for teachers and admins" ON daily_quotes;
CREATE POLICY "Enable insert for teachers and admins" ON daily_quotes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'master_admin'))
);

-- 6. Fix Calendar Events Policy
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
