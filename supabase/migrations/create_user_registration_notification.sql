-- Create a trigger function to handle notifications for new user registrations
CREATE OR REPLACE FUNCTION public.handle_new_user_registration_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_admin RECORD;
    v_user_role TEXT;
    v_message TEXT;
BEGIN
    -- Extract the role, defaulting to 'student' if null
    v_user_role := COALESCE(NEW.role, 'student');

    -- Construct the message
    v_message := 'A new ' || v_user_role || ' named ' || COALESCE(NEW.full_name, 'User') || ' (' || NEW.email || ') has just registered to the platform.';

    -- Notify all Admins
    FOR v_admin IN 
        SELECT id FROM public.users WHERE role = 'admin'
    LOOP
        -- Insert a notification directly into their dashboard
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            priority,
            sender_role,
            visibility,
            created_at,
            sender_id
        ) VALUES (
            v_admin.id,
            'New User Registration',
            v_message,
            'general',
            2, -- High Priority
            'system',
            'all',
            NOW(),
            NEW.id -- The newly registered user triggered this
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists to avoid duplication errors
DROP TRIGGER IF EXISTS on_new_user_registered ON public.users;

-- Attach the trigger to the users table
CREATE TRIGGER on_new_user_registered
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_registration_notification();
