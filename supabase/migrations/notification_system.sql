-- Enhanced Notification System for Orbit Launchpad
-- Supports course-specific notifications, deadline reminders, and priority levels

-- 1. Drop and recreate the notifications table to ensure clean state
DROP TABLE IF EXISTS notifications CASCADE;

-- 2. Create notifications table with all required columns
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'general' CHECK (notification_type IN ('general', 'course', 'deadline', 'assignment', 'quiz', 'module')),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1 CHECK (priority IN (1, 2, 3)), -- 1=teacher, 2=admin, 3=system
    sender_role TEXT DEFAULT 'teacher' CHECK (sender_role IN ('teacher', 'admin', 'system')),
    visibility TEXT DEFAULT 'all' CHECK (visibility IN ('all', 'students', 'teachers', 'specific_course')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Create indexes for faster queries
CREATE INDEX idx_notifications_course_id ON notifications(course_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create a function to send notifications to all enrolled students in a course
CREATE OR REPLACE FUNCTION notify_course_students(
    p_course_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_notification_type TEXT,
    p_sender_id UUID,
    p_sender_role TEXT,
    p_priority INTEGER DEFAULT 1,
    p_assignment_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_student RECORD;
BEGIN
    -- Loop through all enrolled students
    FOR v_student IN 
        SELECT DISTINCT student_id 
        FROM enrollments 
        WHERE course_id = p_course_id
    LOOP
        INSERT INTO notifications (
            user_id,
            title,
            message,
            notification_type,
            course_id,
            assignment_id,
            priority,
            sender_role,
            visibility,
            created_at
        ) VALUES (
            v_student.student_id,
            p_title,
            p_message,
            p_notification_type,
            p_course_id,
            p_assignment_id,
            p_priority,
            p_sender_role,
            'specific_course',
            NOW()
        );
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a function to send deadline reminders
CREATE OR REPLACE FUNCTION send_deadline_reminders()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_assignment RECORD;
    v_enrollment RECORD;
    v_days_until INTEGER;
    v_message TEXT;
BEGIN
    -- Find assignments with upcoming deadlines (2 days and 7 days)
    FOR v_assignment IN 
        SELECT 
            a.id,
            a.title,
            a.due_date,
            a.course_id,
            a.type,
            c.title as course_title
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE a.due_date IS NOT NULL
        AND a.due_date > NOW()
        AND a.due_date <= NOW() + INTERVAL '7 days'
    LOOP
        v_days_until := EXTRACT(DAY FROM (v_assignment.due_date - NOW()));
        
        -- Only send for 2-day and 7-day marks
        IF v_days_until = 2 OR v_days_until = 7 THEN
            v_message := format(
                'Reminder: "%s" in %s is due in %s days on %s',
                v_assignment.title,
                v_assignment.course_title,
                v_days_until,
                TO_CHAR(v_assignment.due_date, 'Mon DD, YYYY at HH24:MI')
            );
            
            -- Send to all enrolled students who haven't submitted
            FOR v_enrollment IN
                SELECT DISTINCT e.student_id
                FROM enrollments e
                WHERE e.course_id = v_assignment.course_id
                AND NOT EXISTS (
                    SELECT 1 FROM submissions s 
                    WHERE s.assignment_id = v_assignment.id 
                    AND s.student_id = e.student_id
                )
                AND NOT EXISTS (
                    SELECT 1 FROM quiz_attempts qa
                    WHERE qa.assignment_id = v_assignment.id
                    AND qa.student_id = e.student_id
                )
            LOOP
                -- Check if reminder already sent today
                IF NOT EXISTS (
                    SELECT 1 FROM notifications
                    WHERE user_id = v_enrollment.student_id
                    AND assignment_id = v_assignment.id
                    AND notification_type = 'deadline'
                    AND created_at::date = CURRENT_DATE
                ) THEN
                    INSERT INTO notifications (
                        user_id,
                        title,
                        message,
                        notification_type,
                        course_id,
                        assignment_id,
                        priority,
                        sender_role,
                        visibility,
                        created_at
                    ) VALUES (
                        v_enrollment.student_id,
                        format('Deadline Reminder: %s', v_assignment.title),
                        v_message,
                        'deadline',
                        v_assignment.course_id,
                        v_assignment.id,
                        2, -- Admin priority
                        'admin',
                        'specific_course',
                        NOW()
                    );
                    v_count := v_count + 1;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create RLS policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers and admins can create notifications" ON notifications;
CREATE POLICY "Teachers and admins can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('teacher', 'admin')
        )
    );

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- 9. Create a view for upcoming deadlines
CREATE OR REPLACE VIEW upcoming_deadlines AS
SELECT 
    a.id as assignment_id,
    a.title,
    a.type,
    a.due_date,
    a.course_id,
    c.title as course_title,
    c.thumbnail_url as course_thumbnail,
    EXTRACT(DAY FROM (a.due_date - NOW())) as days_until_due,
    EXTRACT(HOUR FROM (a.due_date - NOW())) as hours_until_due
FROM assignments a
JOIN courses c ON a.course_id = c.id
WHERE a.due_date IS NOT NULL
AND a.due_date > NOW()
AND a.due_date <= NOW() + INTERVAL '14 days'
ORDER BY a.due_date ASC;

COMMENT ON VIEW upcoming_deadlines IS 'Shows all upcoming assignment/quiz deadlines within the next 14 days';
