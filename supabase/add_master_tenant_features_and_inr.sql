-- ============================================================================
-- ORBIT LMS - MASTER TENANT CUSTOMIZATION, FINANCE ROLE, INR & TICKETS MIGRATION
-- ============================================================================

-- STEP 1: ADD ENUM VALUE 'finance' (RUN THIS FIRST IF ENUM IS USED)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'finance';

-- STEP 2: EXTEND COLLEGES TABLE FOR MULTI-TENANT FEATURE TOGGLES & INR CURRENCY
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 1000;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS enabled_features JSONB DEFAULT '[
  "live_classes",
  "certificates",
  "gamification",
  "quizzes",
  "assignments",
  "ai_json_builder",
  "leaderboard",
  "ticket_raising",
  "coupon_engine",
  "attendance_tracker"
]';

-- STEP 3: CREATE HELP CENTER TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    admin_reply TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Tickets RLS Policies
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
CREATE POLICY "Users can view their own tickets" ON public.tickets
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text IN ('admin', 'super_admin', 'finance')
    ));

DROP POLICY IF EXISTS "Users can insert their own tickets" ON public.tickets;
CREATE POLICY "Users can insert their own tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update tickets" ON public.tickets;
CREATE POLICY "Admins can update tickets" ON public.tickets
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text IN ('admin', 'super_admin', 'finance')
    ));

-- STEP 4: SAFELY LINK AUTH.USERS & PUBLIC.USERS WITH DYNAMIC STRING EXECUTION
DO $$
BEGIN
    -- Insert auth.users entries if not existing
    BEGIN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
        VALUES 
            (gen_random_uuid(), 'master@orbitlms.edu.in', crypt('Master123@', gen_salt('bf')), NOW(), 'authenticated', 'authenticated'),
            (gen_random_uuid(), 'finance@sintechnologies.in', crypt('Finance123@', gen_salt('bf')), NOW(), 'authenticated', 'authenticated')
        ON CONFLICT (email) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Dynamic SQL avoids static PL/pgSQL compilation of uncommitted enum type (Fixes 55P04 error)
    EXECUTE '
        INSERT INTO public.users (id, email, full_name, role, status)
        SELECT 
            id, 
            email, 
            CASE WHEN email = ''master@orbitlms.edu.in'' THEN ''Master Super Admin'' ELSE ''Finance Department Manager'' END,
            (CASE WHEN email = ''master@orbitlms.edu.in'' THEN ''super_admin'' ELSE ''finance'' END)::user_role,
            ''active''
        FROM auth.users 
        WHERE email IN (''master@orbitlms.edu.in'', ''finance@sintechnologies.in'')
        ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role
    ';
END $$;

NOTIFY pgrst, 'reload schema';
