-- ==============================================================================================
-- MULTI-TENANT SAAS LMS DATABASE MIGRATION & BACKEND MIDDLEWARE
-- ==============================================================================================
-- This script transforms the application into a SaaS platform with strict data isolation.
-- It creates the College entity, links all major tables to it, and leverages
-- a Supabase Custom JWT Hook for secure, performant RLS (Row Level Security) without recursion.
-- ==============================================================================================

-- -------------------------------------------------------------
-- 1. Create College Entity & Default Data
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.colleges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    contact_person TEXT,
    phone TEXT,
    subscription_status TEXT DEFAULT 'active',
    activation_status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default College: SIN Education And Technology
INSERT INTO public.colleges (id, name, email, contact_person, phone)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'SIN Education And Technology',
    'admin@sinedutech.com',
    'Default Admin',
    '0000000000'
) ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------
-- 2. Modify Entities (Add CollegeID Foreign Key)
-- -------------------------------------------------------------
-- Payment Records (create if missing)
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount FLOAT NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add super_admin role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Map all tables to College
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE RESTRICT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.course_sections ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.section_contents ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.enrollments ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.submissions ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.quiz_attempts ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE;

-- -------------------------------------------------------------
-- 3. Data Migration
-- -------------------------------------------------------------
-- Migrate all existing data to belong to the Default College
UPDATE public.users SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;
UPDATE public.courses SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;
UPDATE public.course_sections SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;
UPDATE public.section_contents SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;
UPDATE public.assignments SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;
UPDATE public.attendance SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;
UPDATE public.notifications SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;
UPDATE public.payment_records SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;
UPDATE public.enrollments SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;
UPDATE public.submissions SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;
UPDATE public.quiz_attempts SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;

-- -------------------------------------------------------------
-- 4. Backend Middleware: JWT Auth Hook
-- -------------------------------------------------------------
-- This securely injects the role and college_id into the JWT claims
-- so we avoid the infinite recursion error in RLS, replacing slow DB lookups.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
    claims jsonb;
    user_role public.user_role;
    user_college_id uuid;
  BEGIN
    SELECT role, college_id INTO user_role, user_college_id FROM public.users WHERE id = (event->>'user_id')::uuid;

    claims := event->'claims';

    IF user_role IS NOT NULL THEN
      claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(user_role));
    ELSE
      -- Fallback to student if no role is explicitly assigned yet
      claims := jsonb_set(claims, '{app_metadata, user_role}', '"student"');
    END IF;

    IF user_college_id IS NOT NULL THEN
      claims := jsonb_set(claims, '{app_metadata, college_id}', to_jsonb(user_college_id));
    END IF;

    event := jsonb_set(event, '{claims}', claims);
    RETURN event;
  END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Fallback JWT extractors for our policies
CREATE OR REPLACE FUNCTION public.get_college_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    -- Priority 1: Check JWT app_metadata for the college_id injected by Hook
    (auth.jwt() -> 'app_metadata' ->> 'college_id')::UUID, 
    -- Priority 2: Safe database lookup bypassing RLS on self (safe if recursion is broken)
    (SELECT college_id FROM public.users WHERE id = auth.uid())
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'user_role')::TEXT, 
    (SELECT role::text FROM public.users WHERE id = auth.uid())
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;


-- -------------------------------------------------------------
-- 5. Backend Middleware: Database Auto-Inject Trigger
-- -------------------------------------------------------------
-- Automatically inject college_id on INSERT for all APIs so frontend doesn't need to

CREATE OR REPLACE FUNCTION public.auto_inject_college_id()
RETURNS TRIGGER AS $$
DECLARE
    v_college_id UUID;
    v_role TEXT;
BEGIN
    v_college_id := public.get_college_id();
    v_role := public.get_user_role();

    IF v_role != 'super_admin' AND v_college_id IS NOT NULL THEN
        NEW.college_id = v_college_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map Trigger to all major tables
DROP TRIGGER IF EXISTS inject_college_id_courses ON public.courses;
CREATE TRIGGER inject_college_id_courses BEFORE INSERT ON public.courses FOR EACH ROW EXECUTE PROCEDURE public.auto_inject_college_id();

DROP TRIGGER IF EXISTS inject_college_id_course_sections ON public.course_sections;
CREATE TRIGGER inject_college_id_course_sections BEFORE INSERT ON public.course_sections FOR EACH ROW EXECUTE PROCEDURE public.auto_inject_college_id();

DROP TRIGGER IF EXISTS inject_college_id_section_contents ON public.section_contents;
CREATE TRIGGER inject_college_id_section_contents BEFORE INSERT ON public.section_contents FOR EACH ROW EXECUTE PROCEDURE public.auto_inject_college_id();

DROP TRIGGER IF EXISTS inject_college_id_assignments ON public.assignments;
CREATE TRIGGER inject_college_id_assignments BEFORE INSERT ON public.assignments FOR EACH ROW EXECUTE PROCEDURE public.auto_inject_college_id();

DROP TRIGGER IF EXISTS inject_college_id_attendance ON public.attendance;
CREATE TRIGGER inject_college_id_attendance BEFORE INSERT ON public.attendance FOR EACH ROW EXECUTE PROCEDURE public.auto_inject_college_id();

DROP TRIGGER IF EXISTS inject_college_id_notifications ON public.notifications;
CREATE TRIGGER inject_college_id_notifications BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE PROCEDURE public.auto_inject_college_id();

DROP TRIGGER IF EXISTS inject_college_id_payment_records ON public.payment_records;
CREATE TRIGGER inject_college_id_payment_records BEFORE INSERT ON public.payment_records FOR EACH ROW EXECUTE PROCEDURE public.auto_inject_college_id();

-- -------------------------------------------------------------
-- 6. Backend Data Isolation Rules (RLS)
-- -------------------------------------------------------------
-- Rewriting the Multi-tenant policies to cleanly enforce SaaS grouping

DROP POLICY IF EXISTS "Admin manage all users" ON public.users;
CREATE POLICY "Admin manage all users" ON public.users
FOR ALL USING (
    public.get_user_role() IN ('admin', 'super_admin') 
    AND (college_id = public.get_college_id() OR public.get_user_role() = 'super_admin')
);

DROP POLICY IF EXISTS "View users" ON public.users;
CREATE POLICY "View users" ON public.users
FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND (college_id = public.get_college_id() OR public.get_user_role() = 'super_admin')
);

DROP POLICY IF EXISTS "Admin manage courses" ON public.courses;
CREATE POLICY "Admin manage courses" ON public.courses
FOR ALL USING (
    public.get_user_role() IN ('admin', 'super_admin') 
    AND (college_id = public.get_college_id() OR public.get_user_role() = 'super_admin')
);

DROP POLICY IF EXISTS "Teacher manage own courses" ON public.courses;
CREATE POLICY "Teacher manage own courses" ON public.courses
FOR ALL USING (
    teacher_id = auth.uid() 
    AND (college_id = public.get_college_id() OR public.get_user_role() = 'super_admin')
);

DROP POLICY IF EXISTS "View courses list" ON public.courses;
CREATE POLICY "View courses list" ON public.courses
FOR SELECT USING (
    (college_id = public.get_college_id() OR public.get_user_role() = 'super_admin')
);
