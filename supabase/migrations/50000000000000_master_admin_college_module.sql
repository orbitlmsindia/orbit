-- ==============================================================================================
-- MASTER ADMIN COLLEGE MANAGEMENT MODULE & AUDIT LOGS
-- ==============================================================================================

-- 1. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS for Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Master Admin can view all audit logs
CREATE POLICY "Master Admins view audit logs"
ON public.audit_logs
FOR SELECT USING (
    public.get_user_role() = 'super_admin'
);

-- System can insert logs (or Super Admins directly)
CREATE POLICY "Insert audit logs"
ON public.audit_logs
FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
);

-- 2. Optimized View for College List
-- Pre-calculates students, teachers, courses per college
CREATE OR REPLACE VIEW public.college_stats_view AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.contact_person,
    c.subscription_status,
    c.activation_status,
    c.created_at,
    (SELECT COUNT(*) FROM public.users u WHERE u.college_id = c.id AND u.role = 'student') as student_count,
    (SELECT COUNT(*) FROM public.users u WHERE u.college_id = c.id AND u.role = 'teacher') as teacher_count,
    (SELECT COUNT(*) FROM public.courses cr WHERE cr.college_id = c.id) as course_count
FROM 
    public.colleges c;

-- 3. Modify JWT Hook to Enforce College Deactivation
-- This instantly blocks data access at the deepest level if suspended, without extra frontend round-trips.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
    claims jsonb;
    user_role public.user_role;
    user_college_id uuid;
    college_active boolean;
  BEGIN
    SELECT role, college_id INTO user_role, user_college_id 
    FROM public.users WHERE id = (event->>'user_id')::uuid;

    -- If user belongs to a college, verify activation status
    IF user_college_id IS NOT NULL AND user_role != 'super_admin' THEN
        SELECT activation_status INTO college_active FROM public.colleges WHERE id = user_college_id;
        
        IF college_active = false THEN
            -- Injects a deactivated flag to block sessions/UI rendering via RLS & Client checks
            claims := event->'claims';
            claims := jsonb_set(claims, '{app_metadata, role}', '"suspended"');
            claims := jsonb_set(claims, '{app_metadata, college_id}', 'null');
            event := jsonb_set(event, '{claims}', claims);
            RETURN event;
        END IF;
    END IF;

    claims := event->'claims';

    IF user_role IS NOT NULL THEN
      claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(user_role));
    ELSE
      claims := jsonb_set(claims, '{app_metadata, user_role}', '"student"');
    END IF;

    IF user_college_id IS NOT NULL THEN
      claims := jsonb_set(claims, '{app_metadata, college_id}', to_jsonb(user_college_id));
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
  END;
$$;

-- 4. Audit Log Function Helper
CREATE OR REPLACE FUNCTION public.log_audit_action(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
