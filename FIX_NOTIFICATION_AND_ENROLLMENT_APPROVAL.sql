-- ==============================================================================
-- ORBIT LMS: Complete Notification Constraint & Enrollment Approval Fix (Idempotent)
-- Description: 
-- 1. Drops old restrictive check constraints on public.notifications that caused
--    "violates check constraint notifications_notification_type_check"
-- 2. Allows all notification types ('enrollment', 'enrollment_approved', etc.)
-- 3. Protects the enrollment trigger with EXCEPTION handling so student enrollment
--    will NEVER fail even if notifications encounter any edge case.
-- 4. Cleans up pending enrollment notifications across teachers/admins on approval.
-- ==============================================================================

-- 1. Ensure notifications table has all necessary columns
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'general',
    sender_role TEXT DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure all columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='course_id') THEN
        ALTER TABLE public.notifications ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='enrollment_id') THEN
        ALTER TABLE public.notifications ADD COLUMN enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='notification_type') THEN
        ALTER TABLE public.notifications ADD COLUMN notification_type TEXT DEFAULT 'general';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='sender_role') THEN
        ALTER TABLE public.notifications ADD COLUMN sender_role TEXT DEFAULT 'system';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='sender_id') THEN
        ALTER TABLE public.notifications ADD COLUMN sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. DROP RESTRICTIVE CHECK CONSTRAINTS TO FIX "violates check constraint" ERROR
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add comprehensive constraint that allows all Orbit LMS notification types
ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check 
    CHECK (notification_type IS NULL OR notification_type IN (
        'general', 'course', 'deadline', 'assignment', 'quiz', 'module', 
        'announcement', 'reminder', 'alert', 'event', 'enrollment', 
        'enrollment_approved', 'enrollment_rejected', 'system', 'live_class', 'grade'
    ));

-- 4. Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Drop ALL existing policies to ensure clean idempotent execution
DROP POLICY IF EXISTS "notifications_user_all" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own or sent notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their received notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications safely" ON public.notifications;
DROP POLICY IF EXISTS "notifications_user_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_user_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_user_delete" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;

-- 6. Create Policies for notifications
CREATE POLICY "notifications_user_select" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR (sender_id IS NOT NULL AND sender_id = auth.uid()));

CREATE POLICY "notifications_user_update" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_user_delete" ON public.notifications
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.courses c 
            WHERE c.id = notifications.course_id AND c.teacher_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.role IN ('admin', 'super_admin', 'master_admin')
        )
    );

CREATE POLICY "notifications_insert_all" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (TRUE);

-- 7. Trigger Function 1: Automatically notify course instructor and admins on enrollment insertion
--    (Wrapped in EXCEPTION handler so enrollment NEVER fails!)
CREATE OR REPLACE FUNCTION public.fn_notify_on_new_enrollment()
RETURNS TRIGGER AS $$
DECLARE
    v_teacher_id UUID;
    v_course_title TEXT;
    v_student_name TEXT;
    v_admin_record RECORD;
BEGIN
    BEGIN
        -- Fetch course teacher and title
        SELECT teacher_id, title INTO v_teacher_id, v_course_title
        FROM public.courses
        WHERE id = NEW.course_id;

        -- Fetch student full name
        SELECT full_name INTO v_student_name
        FROM public.users
        WHERE id = NEW.student_id;

        IF v_student_name IS NULL OR v_student_name = '' THEN
            v_student_name := 'A student';
        END IF;

        IF v_course_title IS NULL THEN
            v_course_title := 'Course';
        END IF;

        -- 1. Notify the Course Teacher (if teacher_id exists)
        IF v_teacher_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                notification_type,
                sender_role,
                is_read,
                course_id,
                enrollment_id,
                created_at
            ) VALUES (
                v_teacher_id,
                'New Student Enrollment',
                v_student_name || ' has enrolled in your course: ' || v_course_title || 
                CASE WHEN NEW.transaction_id IS NOT NULL AND NEW.transaction_id <> '' 
                     THEN ' (Transaction ID: ' || NEW.transaction_id || ')' 
                     ELSE '' 
                END || '. Review & Approve.',
                'enrollment',
                'student',
                FALSE,
                NEW.course_id,
                NEW.id,
                NOW()
            );
        END IF;

        -- 2. Notify all Administrators
        FOR v_admin_record IN 
            SELECT id FROM public.users WHERE role IN ('admin', 'super_admin', 'master_admin')
        LOOP
            IF v_admin_record.id <> v_teacher_id THEN
                INSERT INTO public.notifications (
                    user_id,
                    title,
                    message,
                    notification_type,
                    sender_role,
                    is_read,
                    course_id,
                    enrollment_id,
                    created_at
                ) VALUES (
                    v_admin_record.id,
                    'New Student Enrollment',
                    v_student_name || ' has enrolled in course: ' || v_course_title || 
                    CASE WHEN NEW.transaction_id IS NOT NULL AND NEW.transaction_id <> '' 
                         THEN ' (Transaction ID: ' || NEW.transaction_id || ')' 
                         ELSE '' 
                    END || '. Approval required.',
                    'enrollment',
                    'student',
                    FALSE,
                    NEW.course_id,
                    NEW.id,
                    NOW()
                );
            END IF;
        END LOOP;

    EXCEPTION WHEN OTHERS THEN
        -- Safely catch any notification error so the student enrollment transaction succeeds!
        RAISE NOTICE 'Notification dispatch warning: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the enrollment trigger
DROP TRIGGER IF EXISTS trg_notify_on_new_enrollment ON public.enrollments;
DROP TRIGGER IF EXISTS trg_create_enrollment_notification ON public.enrollments;

CREATE TRIGGER trg_notify_on_new_enrollment
    AFTER INSERT ON public.enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_on_new_enrollment();

-- 8. Trigger Function 2: Cleanup pending notifications and notify student on enrollment approval
CREATE OR REPLACE FUNCTION public.fn_cleanup_on_enrollment_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_course_title TEXT;
    v_student_name TEXT;
BEGIN
    BEGIN
        -- Only proceed if status transitioned to 'approved'
        IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
            -- Fetch course title
            SELECT title INTO v_course_title
            FROM public.courses
            WHERE id = NEW.course_id;

            -- Fetch student name
            SELECT full_name INTO v_student_name
            FROM public.users
            WHERE id = NEW.student_id;

            -- Delete all pending enrollment request notifications for this enrollment
            DELETE FROM public.notifications
            WHERE enrollment_id = NEW.id;

            -- Also delete any matching message by course_id and student name
            IF v_student_name IS NOT NULL AND v_student_name <> '' THEN
                DELETE FROM public.notifications
                WHERE course_id = NEW.course_id
                  AND (notification_type = 'enrollment' OR title ILIKE '%enrollment%')
                  AND message ILIKE '%' || v_student_name || '%';
            END IF;

            -- If transaction_id exists, delete notifications referencing that transaction
            IF NEW.transaction_id IS NOT NULL AND NEW.transaction_id <> '' THEN
                DELETE FROM public.notifications
                WHERE (notification_type = 'enrollment' OR title ILIKE '%enrollment%')
                  AND message ILIKE '%' || NEW.transaction_id || '%';
            END IF;

            -- Send confirmation notification to the student
            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                notification_type,
                sender_role,
                is_read,
                course_id,
                enrollment_id,
                created_at
            ) VALUES (
                NEW.student_id,
                'Course Enrollment Approved! 🎉',
                'Congratulations! Your enrollment in "' || COALESCE(v_course_title, 'the course') || '" has been approved. You now have full access to all lectures, learning materials, and live calendar sessions.',
                'enrollment_approved',
                'teacher',
                FALSE,
                NEW.course_id,
                NEW.id,
                NOW()
            );
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Approval notification cleanup warning: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the approval cleanup trigger
DROP TRIGGER IF EXISTS trg_cleanup_on_enrollment_approval ON public.enrollments;
CREATE TRIGGER trg_cleanup_on_enrollment_approval
    AFTER UPDATE OF status ON public.enrollments
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_cleanup_on_enrollment_approval();

-- 9. Clean up any existing leftover enrollment notifications that have already been approved
DELETE FROM public.notifications n
USING public.enrollments e
WHERE n.enrollment_id = e.id
  AND e.status = 'approved'
  AND (n.notification_type = 'enrollment' OR n.title ILIKE '%enrollment%');

-- Verify
SELECT COUNT(*) as total_notifications FROM public.notifications;
