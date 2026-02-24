-- Create a trigger function to handle notifications for new enrollments
CREATE OR REPLACE FUNCTION public.handle_new_enrollment_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_student_name TEXT;
    v_course_title TEXT;
    v_teacher_id UUID;
    v_admin RECORD;
    v_message TEXT;
BEGIN
    -- 1. Fetch Student Name (Fallback to 'A student' if null)
    SELECT COALESCE(full_name, 'A student') INTO v_student_name
    FROM public.users
    WHERE id = NEW.student_id;

    -- 2. Fetch Course Title and Teacher ID
    SELECT title, teacher_id INTO v_course_title, v_teacher_id
    FROM public.courses
    WHERE id = NEW.course_id;

    -- If we can't find the course, exit safely
    IF v_course_title IS NULL THEN
        RETURN NEW;
    END IF;

    -- Construct the message
    v_message := v_student_name || ' has enrolled in your course: ' || v_course_title;

    -- 3. Notify the Teacher
    IF v_teacher_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            course_id,
            priority,
            sender_role,
            visibility,
            created_at,
            sender_id
        ) VALUES (
            v_teacher_id,
            'New Student Enrollment',
            v_message,
            'course',
            NEW.course_id,
            2, -- High Priority
            'system',
            'teachers',
            NOW(),
            NEW.student_id -- The student triggered this
        );
    END IF;

    -- 4. Notify all Admins
    FOR v_admin IN 
        SELECT id FROM public.users WHERE role = 'admin'
    LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            course_id,
            priority,
            sender_role,
            visibility,
            created_at,
            sender_id
        ) VALUES (
            v_admin.id,
            'New Student Enrollment',
            v_student_name || ' just enrolled in ' || v_course_title,
            'general',
            NEW.course_id,
            2, -- High Priority
            'system',
            'all',
            NOW(),
            NEW.student_id
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists to avoid duplication errors
DROP TRIGGER IF EXISTS on_new_enrollment_created ON public.enrollments;

-- Attach the trigger to the enrollments table
CREATE TRIGGER on_new_enrollment_created
AFTER INSERT ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_enrollment_notification();
