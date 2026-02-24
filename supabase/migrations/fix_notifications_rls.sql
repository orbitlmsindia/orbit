-- FIX: Update the Notification System
-- This safely updates the RPC function and RLS policies for notifications so that:
-- 1. sender_id is properly inserted so Teachers can see their sent history
-- 2. Teachers can ACTUALLY see the notifications they sent via RLS
-- 3. Recursion errors are avoided in the insert policy by using standard Auth Context

-- Recreate the notify_course_students function with sender_id properly included
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
        FROM public.enrollments 
        WHERE course_id = p_course_id
        AND status = 'active' -- Only notify active students!
    LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            course_id,
            assignment_id,
            priority,
            sender_role,
            visibility,
            created_at,
            sender_id
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
            NOW(),
            p_sender_id  -- THIS WAS MISSING PREVIOUSLY!
        );
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fix RLS Policies for notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Teachers and admins can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- 2. Create the View Policy: Allow viewing if you are the recipient (user_id) OR the creator (sender_id)
CREATE POLICY "Users can view their own or sent notifications"
    ON public.notifications FOR SELECT
    USING ( auth.uid() = user_id OR auth.uid() = sender_id );

-- 3. Create the Update Policy: Allow updating if you are the recipient (e.g. marking as read)
CREATE POLICY "Users can update their received notifications"
    ON public.notifications FOR UPDATE
    USING ( auth.uid() = user_id );

-- 4. Create the Insert Policy: Allow insertions for authenticated users safely to avoid recursion errors
-- (The RPC function bypasses this anyway, but keeping it clean prevents 'permission denied' if the app ever does direct inserts)
CREATE POLICY "Authenticated users can create notifications safely"
    ON public.notifications FOR INSERT
    WITH CHECK ( auth.role() = 'authenticated' );
