-- ==============================================================================================
-- SAAS SUBSCRIPTION, BILLING & CRON JOB SCHEMA
-- ==============================================================================================

-- 1. Modify Colleges Table with Subscription Windows
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS subscription_expiry_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + interval '30 days');

-- We standardize subscription_status: 'active', 'suspended', 'expired', 'trial', 'deleted'
-- Just ensure the textual field continues to work, but add a strict constraint if desired.
-- For standardizing, let's simply update any missing ones to active.
UPDATE public.colleges SET subscription_status = 'active' WHERE subscription_status IS NULL;

-- 2. Create Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL, -- specific course billed
    invoice_number TEXT NOT NULL UNIQUE,
    student_count INTEGER NOT NULL DEFAULT 0,
    cost_per_student FLOAT NOT NULL DEFAULT 0.0,
    total_amount FLOAT NOT NULL DEFAULT 0.0,
    status TEXT DEFAULT 'pending', -- pending, paid, cancelled
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS for Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Master Admins can manage all invoices
CREATE POLICY "Master admins manage all invoices" ON public.invoices
FOR ALL USING (public.get_user_role() = 'super_admin');

-- College Admins can view their own invoices
CREATE POLICY "College admins view own invoices" ON public.invoices
FOR SELECT USING (
    public.get_user_role() = 'admin' AND college_id = public.get_college_id()
);

-- 3. Invoices Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for Invoices (Master Admins insert/read, College Admins read)
-- Note: actual table name for storage policies is storage.objects
DROP POLICY IF EXISTS "Master Admins full access to invoices" ON storage.objects;
CREATE POLICY "Master Admins full access to invoices" ON storage.objects
FOR ALL USING (
    bucket_id = 'invoices' AND
    public.get_user_role() = 'super_admin'
);

DROP POLICY IF EXISTS "College Admins view own invoices" ON storage.objects;
CREATE POLICY "College Admins view own invoices" ON storage.objects
FOR SELECT USING (
    bucket_id = 'invoices' AND
    public.get_user_role() = 'admin' AND
    (storage.foldername(name))[1] = public.get_college_id()::text
);


-- 4. Auto Cron Job: Disable Expired Colleges
-- This procedure checks all colleges. If expiry date is past, flips activation_status = false
-- Our previously built JWT custom_access_token_hook immediately reads activation_status on login,
-- so if activation_status = false, it blocks logins and locks the tenants globally.

CREATE OR REPLACE FUNCTION public.cron_disable_expired_colleges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.colleges
    SET 
        activation_status = false,
        subscription_status = 'expired'
    WHERE 
        subscription_expiry_date < NOW() 
        AND activation_status = true;

    -- NOTE: In a true production environment, you might log these implicitly to audit_logs 
    -- using a Trigger on UPDATE if status changes from active to expired.
END;
$$;

-- Note: Supabase provides pg_cron extension naturally.
-- To schedule it automatically at 12:00 AM every day:
-- Note: Running schema migrations with pg_cron creation can sometimes fail if postgres role permissions differ locally.
-- We wrap in DO block to silently catch permission errors if run by an inferior UI user instead of superuser postgres
DO $$
BEGIN
    -- Ensure extension exists
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    
    -- Unschedule if already exists to prevent duplicates
    PERFORM cron.unschedule('daily_college_expiry_check');
    
    -- Schedule the function daily at Midnight
    PERFORM cron.schedule(
        'daily_college_expiry_check', 
        '0 0 * * *', 
        'SELECT public.cron_disable_expired_colleges();'
    );
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron creation skipped (expected if not running as superuser or on local emulator without permissions). The function `cron_disable_expired_colleges()` was still successfully prepared.';
END $$;
