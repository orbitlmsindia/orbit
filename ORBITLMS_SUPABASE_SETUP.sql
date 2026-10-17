-- ==============================================================================================
-- ORBIT LMS - UNIFIED SUPABASE DATABASE MIGRATIONS & PERMISSION POLICIES
-- Description: Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
--              to ensure all tables, columns, and RLS policies for all user roles are 100% active.
-- ==============================================================================================

-- ── 1. COLLEGE INVOICES & SUBSCRIPTIONS SETUP ──────────────────────────────────────────────────
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS subscription_expiry_date TIMESTAMPTZ DEFAULT (NOW() + interval '30 days');
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS activation_status BOOLEAN DEFAULT true;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS reminder_note TEXT;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS billing_reminder_active BOOLEAN DEFAULT false;

UPDATE public.colleges 
SET activation_status = true, subscription_status = 'active' 
WHERE activation_status IS NULL OR subscription_status IS NULL;

-- Ensure invoices table exists
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    student_count INTEGER NOT NULL DEFAULT 0,
    cost_per_student FLOAT NOT NULL DEFAULT 0.0,
    total_amount FLOAT NOT NULL DEFAULT 0.0,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master admins manage all invoices" ON public.invoices;
DROP POLICY IF EXISTS "College admins view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Invoices read policy" ON public.invoices;
DROP POLICY IF EXISTS "Invoices full access policy" ON public.invoices;

CREATE POLICY "Invoices full access policy" ON public.invoices
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (users.role IN ('super_admin', 'master_admin') OR users.role = 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    );
-- ── 1B. SUBSCRIPTION PLANS TABLE & TEMPLATES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tier TEXT DEFAULT 'pro',
    price_monthly FLOAT NOT NULL DEFAULT 0.0,
    price_annual FLOAT NOT NULL DEFAULT 0.0,
    max_students INTEGER NOT NULL DEFAULT 1000,
    duration_days INTEGER NOT NULL DEFAULT 30,
    enabled_features TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Master admins manage all subscription plans" ON public.subscription_plans;

CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Master admins manage all subscription plans" ON public.subscription_plans
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    );

-- Seed default plans if table is empty
INSERT INTO public.subscription_plans (id, name, description, tier, price_monthly, price_annual, max_students, duration_days, enabled_features, is_active)
VALUES 
    ('plan-starter', 'Starter Academic Tier', 'Essential LMS tools for small colleges and academic departments.', 'starter', 4999, 49999, 250, 30, ARRAY['assignments', 'quizzes', 'certificates', 'attendance_tracker'], true),
    ('plan-pro', 'Pro Growth Institutional Tier', 'Comprehensive LMS suite with interactive live classes, streaks, and student engagement.', 'pro', 14999, 149999, 1000, 30, ARRAY['live_classes', 'quizzes', 'assignments', 'certificates', 'gamification', 'leaderboard', 'ticket_raising', 'attendance_tracker'], true),
    ('plan-enterprise', 'Enterprise University Suite', 'Full multi-faculty platform with AI curriculum builder, coupons, and custom branding.', 'enterprise', 39999, 399999, 5000, 365, ARRAY['live_classes', 'quizzes', 'assignments', 'ai_json_builder', 'certificates', 'gamification', 'leaderboard', 'attendance_tracker', 'coupon_engine', 'ticket_raising', 'advanced_analytics', 'custom_branding'], true),
    ('plan-ai-accelerator', 'AI Autonomous Campus Tier', 'Unlimited student capacity with next-generation AI agents and dedicated cloud compute.', 'custom', 59999, 599999, 15000, 365, ARRAY['live_classes', 'quizzes', 'assignments', 'ai_json_builder', 'certificates', 'gamification', 'leaderboard', 'attendance_tracker', 'coupon_engine', 'ticket_raising', 'advanced_analytics', 'custom_branding'], true)
ON CONFLICT (id) DO NOTHING;

-- ── 2. ENROLLMENTS RLS POLICIES (STUDENT, TEACHER, ADMIN, SUPER_ADMIN, FINANCE) ─────────────
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE;

-- Backfill college_id on enrollments and courses
UPDATE public.courses SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;
UPDATE public.enrollments SET college_id = '00000000-0000-0000-0000-000000000001' WHERE college_id IS NULL;

-- Drop obsolete policies
DROP POLICY IF EXISTS "enrollments_own" ON public.enrollments;
DROP POLICY IF EXISTS "Student view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "student_insert_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "Students can enroll themselves" ON public.enrollments;
DROP POLICY IF EXISTS "admin_insert_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "admin_update_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "admin_delete_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "admin_view_all_enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin manage enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admins manage all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Super admins and admins manage all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can view course enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can update course enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can delete course enrollments" ON public.enrollments;

-- Student Policies
CREATE POLICY "Students can enroll themselves"
    ON public.enrollments FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own enrollments"
    ON public.enrollments FOR SELECT TO authenticated
    USING (auth.uid() = student_id);

-- Teacher Policies (Can view enrollments for courses they instruct or collaborate on)
CREATE POLICY "Teachers can view course enrollments"
    ON public.enrollments FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = enrollments.course_id
            AND (courses.teacher_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.course_collaborators cc 
                WHERE cc.course_id = courses.id AND cc.teacher_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Teachers can update course enrollments"
    ON public.enrollments FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = enrollments.course_id
            AND (courses.teacher_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.course_collaborators cc 
                WHERE cc.course_id = courses.id AND cc.teacher_id = auth.uid()
            ))
        )
    );

-- Admin, Super Admin & Finance Policy (Full access across the platform)
CREATE POLICY "Super admins and admins manage all enrollments"
    ON public.enrollments FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'master_admin', 'finance')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'master_admin', 'finance')
        )
    );

-- ── 3. CONTACT MESSAGES (PUBLIC INQUIRIES & ADMISSION INQUIRIES) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'contacted', 'resolved'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Anyone can submit contact message" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can delete contact messages" ON public.contact_messages;

CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins can view contact messages" ON public.contact_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'master_admin')
        )
    );

CREATE POLICY "Admins can update contact messages" ON public.contact_messages
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'master_admin')
        )
    );

-- ── 4. CALENDAR EVENTS & COURSE ADMISSION GATING ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    type TEXT DEFAULT 'event',
    visibility TEXT DEFAULT 'all',
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_type_check 
    CHECK (type IN ('event', 'holiday', 'deadline', 'announcement', 'exam', 'live_class', 'quiz', 'assignment'));

ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_visibility_check;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_visibility_check 
    CHECK (visibility IN ('all', 'teachers', 'students', 'course'));

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_admin_full_access" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_teacher_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_teacher_modify" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_student_select" ON public.calendar_events;

-- Admins & Super Admins full access
CREATE POLICY "calendar_events_admin_full_access" ON public.calendar_events
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'master_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'master_admin')
        )
    );

-- Teachers access
CREATE POLICY "calendar_events_teacher_select" ON public.calendar_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'teacher'
        )
        AND (
            visibility IN ('all', 'teachers')
            OR (course_id IS NOT NULL AND course_id IN (
                SELECT id FROM public.courses WHERE teacher_id = auth.uid()
            ))
        )
    );

CREATE POLICY "calendar_events_teacher_modify" ON public.calendar_events
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'teacher'
        )
        AND course_id IN (
            SELECT id FROM public.courses WHERE teacher_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'teacher'
        )
        AND course_id IN (
            SELECT id FROM public.courses WHERE teacher_id = auth.uid()
        )
    );

-- Students (Strictly gated by enrollment approval)
CREATE POLICY "calendar_events_student_select" ON public.calendar_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'student'
            AND (users.status = 'active' OR users.status = 'approved' OR users.status IS NULL)
        )
        AND (
            (
                visibility IN ('all', 'students') 
                AND course_id IS NULL 
                AND type IN ('holiday', 'announcement', 'event')
            )
            OR
            (
                course_id IS NOT NULL 
                AND course_id IN (
                    SELECT enrollments.course_id 
                    FROM public.enrollments 
                    WHERE enrollments.student_id = auth.uid()
                    AND enrollments.status IN ('approved', 'active')
                )
            )
        )
    );

-- ── 5. HELPER PERFORMANCE INDEXES ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_college_id ON public.invoices(college_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_course_id ON public.calendar_events(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status ON public.enrollments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_courses_college_id ON public.courses(college_id);

-- ── 6. SEO BLOGS ENGINE TABLE & POLICIES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blogs (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    category TEXT DEFAULT 'EdTech',
    tags TEXT[] DEFAULT '{}',
    author_name TEXT DEFAULT 'Orbit Editorial Team',
    author_role TEXT DEFAULT 'EdTech Research Lead',
    author_avatar TEXT,
    reading_time TEXT DEFAULT '5 min read',
    is_published BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    meta_title TEXT,
    meta_description TEXT,
    focus_keywords TEXT[] DEFAULT '{}',
    canonical_url TEXT,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published blogs" ON public.blogs;
DROP POLICY IF EXISTS "Master admins manage all blogs" ON public.blogs;

CREATE POLICY "Anyone can view published blogs" ON public.blogs
    FOR SELECT TO anon, authenticated
    USING (
        is_published = true 
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    );

CREATE POLICY "Master admins manage all blogs" ON public.blogs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    );

CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_published ON public.blogs(is_published);
CREATE INDEX IF NOT EXISTS idx_blogs_category ON public.blogs(category);

-- ── 7. CAREERS & JOB APPLICATIONS TABLES & POLICIES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_openings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    job_type TEXT DEFAULT 'Full-time',
    experience_level TEXT DEFAULT '1-3 Years',
    salary_range TEXT,
    description TEXT NOT NULL,
    responsibilities TEXT[] DEFAULT '{}',
    requirements TEXT[] DEFAULT '{}',
    benefits TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active job openings" ON public.job_openings;
DROP POLICY IF EXISTS "Master admins manage job openings" ON public.job_openings;

CREATE POLICY "Anyone can view active job openings" ON public.job_openings
    FOR SELECT TO anon, authenticated
    USING (
        is_active = true 
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    );

CREATE POLICY "Master admins manage job openings" ON public.job_openings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    );

CREATE TABLE IF NOT EXISTS public.job_applications (
    id TEXT PRIMARY KEY,
    job_id TEXT REFERENCES public.job_openings(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    candidate_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    location TEXT,
    experience_level TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    resume_url TEXT NOT NULL,
    cover_letter TEXT,
    expected_ctc TEXT,
    notice_period TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewing', 'shortlisted', 'interview_scheduled', 'rejected', 'hired'
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit job applications" ON public.job_applications;
DROP POLICY IF EXISTS "Master admins view and manage all applications" ON public.job_applications;

CREATE POLICY "Anyone can submit job applications" ON public.job_applications
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Master admins view and manage all applications" ON public.job_applications
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    );

CREATE INDEX IF NOT EXISTS idx_job_openings_active ON public.job_openings(is_active);
CREATE INDEX IF NOT EXISTS idx_job_openings_dept ON public.job_openings(department);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);

-- ── 8. MASTER ADMIN CUSTOM ROLES & STAFF DELEGATION SETUP ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.master_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT 'from-blue-600 to-indigo-600',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.master_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view master roles" ON public.master_roles;
DROP POLICY IF EXISTS "Master admins manage master roles" ON public.master_roles;

CREATE POLICY "Public can view master roles" ON public.master_roles
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Master admins manage master roles" ON public.master_roles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    );

-- Seed System & Core Predefined Roles
INSERT INTO public.master_roles (id, name, slug, description, color, permissions, is_system)
VALUES 
    (
        'role_master_admin',
        'Master Admin / Super Admin',
        'super_admin',
        'Unrestricted root authority across all colleges, databases, billing, and platform settings.',
        'from-amber-500 to-red-600',
        '["view_colleges", "manage_colleges", "toggle_maintenance", "view_plans", "manage_plans", "view_accounts", "manage_accounts", "export_accounts", "view_courses", "moderate_courses", "view_billing", "generate_invoices", "send_reminders", "view_blogs", "publish_blogs", "view_careers", "manage_jobs", "review_applications", "view_analytics", "export_analytics", "system_monitoring", "manage_roles"]'::jsonb,
        true
    ),
    (
        'role_tech_architect',
        'Technical Architect',
        'tech_architect',
        'Handles infrastructure resilience, server monitoring, database latency, course audit, and maintenance modes on behalf of Master Admin.',
        'from-blue-600 to-indigo-600',
        '["view_colleges", "toggle_maintenance", "view_courses", "moderate_courses", "view_accounts", "view_analytics", "system_monitoring"]'::jsonb,
        false
    ),
    (
        'role_platform_ops',
        'Platform Operations Lead',
        'platform_ops',
        'Orchestrates tenant university onboarding, maintenance status, user management, and course audits.',
        'from-emerald-600 to-teal-600',
        '["view_colleges", "manage_colleges", "toggle_maintenance", "view_accounts", "manage_accounts", "view_courses", "view_analytics"]'::jsonb,
        false
    ),
    (
        'role_finance_director',
        'Finance & Billing Director',
        'finance_director',
        'Supervises subscription tiers, college invoice generation, payment reminders, and revenue health.',
        'from-purple-600 to-pink-600',
        '["view_colleges", "view_plans", "manage_plans", "view_accounts", "export_accounts", "view_billing", "generate_invoices", "send_reminders", "view_analytics", "export_analytics"]'::jsonb,
        false
    ),
    (
        'role_seo_editor',
        'Content & SEO Strategist',
        'seo_editor',
        'Authors and publishes SEO-optimized blogs, manages schema markups, and tracks platform readership metrics.',
        'from-cyan-600 to-blue-500',
        '["view_blogs", "publish_blogs", "view_analytics"]'::jsonb,
        false
    ),
    (
        'role_talent_lead',
        'Head of Talent & Recruitment',
        'talent_lead',
        'Manages Orbit LMS career openings, reviews incoming talent applications, and coordinates interview workflows.',
        'from-orange-500 to-amber-600',
        '["view_careers", "manage_jobs", "review_applications"]'::jsonb,
        false
    )
ON CONFLICT (slug) DO UPDATE
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Master Staff Directory
CREATE TABLE IF NOT EXISTS public.master_staff (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    department TEXT,
    role_slug TEXT NOT NULL,
    role_name TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'suspended', 'invited'
    avatar TEXT,
    password_hash TEXT,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.master_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can check staff status" ON public.master_staff;
DROP POLICY IF EXISTS "Master admins manage all staff" ON public.master_staff;

CREATE POLICY "Public can check staff status" ON public.master_staff
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Master admins manage all staff" ON public.master_staff
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'master_admin')
        )
    );

-- Seed Initial Delegated Staff Under Master Admin
INSERT INTO public.master_staff (id, full_name, email, phone, department, role_slug, role_name, status, avatar, last_login)
VALUES
    (
        'staff_vikram_architect',
        'Vikram Sharma',
        'vikram.architect@orbitlms.in',
        '+91 98765 43210',
        'Cloud Engineering & Architecture',
        'tech_architect',
        'Technical Architect',
        'active',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        NOW() - interval '2 hours'
    ),
    (
        'staff_ananya_ops',
        'Ananya Iyer',
        'ananya.ops@orbitlms.in',
        '+91 98765 88990',
        'Platform Operations & Quality',
        'platform_ops',
        'Platform Operations Lead',
        'active',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        NOW() - interval '6 hours'
    ),
    (
        'staff_rohit_finance',
        'Rohit Deshmukh',
        'rohit.finance@orbitlms.in',
        '+91 98220 11223',
        'Corporate Finance & Treasury',
        'finance_director',
        'Finance & Billing Director',
        'active',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        NOW() - interval '1 day'
    ),
    (
        'staff_priya_seo',
        'Priya Nair',
        'priya.seo@orbitlms.in',
        '+91 98111 22334',
        'Growth & Digital Marketing',
        'seo_editor',
        'Content & SEO Strategist',
        'active',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        NOW() - interval '3 hours'
    ),
    (
        'staff_rahul_talent',
        'Rahul Verma',
        'rahul.talent@orbitlms.in',
        '+91 98450 77889',
        'People & Talent Acquisition',
        'talent_lead',
        'Head of Talent & Recruitment',
        'active',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        NOW() - interval '2 days'
    )
ON CONFLICT (email) DO UPDATE
SET
    full_name = EXCLUDED.full_name,
    department = EXCLUDED.department,
    role_slug = EXCLUDED.role_slug,
    role_name = EXCLUDED.role_name,
    status = EXCLUDED.status;

-- ── 9. COUPONS & INSTITUTIONAL DISCOUNTS SETUP ─────────────────────────────────────────
-- Ensure pricing columns exist on courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS organization_name TEXT,
ADD COLUMN IF NOT EXISTS organization_logo_url TEXT;

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'flat')),
    discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_uses INTEGER DEFAULT NULL,
    used_count INTEGER DEFAULT 0,
    min_purchase NUMERIC(10,2) DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    discount_applied NUMERIC(10,2) NOT NULL DEFAULT 0,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coupon_id, student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_course ON public.coupons(course_id);
CREATE INDEX IF NOT EXISTS idx_coupons_college ON public.coupons(college_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_student ON public.coupon_usage(student_id);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin and teachers manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Students can use coupons" ON public.coupon_usage;
DROP POLICY IF EXISTS "Anyone can view coupon usage" ON public.coupon_usage;
DROP POLICY IF EXISTS "View coupon usage policy" ON public.coupon_usage;
DROP POLICY IF EXISTS "Students insert own coupon usage" ON public.coupon_usage;

-- 1. Public and students can view active coupons for redemption
CREATE POLICY "Public can view active coupons" ON public.coupons
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

-- 2. Strictly teachers, college admins, and master admins can create/update/delete coupons
CREATE POLICY "Admin and teachers manage coupons" ON public.coupons
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('teacher', 'admin', 'master_admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('teacher', 'admin', 'master_admin', 'super_admin')
        )
    );

-- 3. Coupon usage: users view their own redemptions; teachers/admins view course usage
CREATE POLICY "View coupon usage policy" ON public.coupon_usage
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('teacher', 'admin', 'master_admin', 'super_admin')
        )
    );

-- 4. Students can only record redemptions for themselves
CREATE POLICY "Students insert own coupon usage" ON public.coupon_usage
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id = auth.uid()
    );

-- Seed Default Welcome Coupons
INSERT INTO public.coupons (code, description, discount_type, discount_value, max_uses, min_purchase, is_active)
VALUES 
    ('WELCOME100', '100% Full Scholarship Waiver - Free Enrollment', 'percentage', 100, 1000, 0, true),
    ('ORBIT50', '50% Early Bird Institutional Discount', 'percentage', 50, 500, 0, true),
    ('FLAT500', 'Flat Rs. 500 Discount on Premium Courses', 'flat', 500, 200, 999, true)
ON CONFLICT (code) DO UPDATE
SET 
    description = EXCLUDED.description,
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    is_active = EXCLUDED.is_active;

-- ==============================================================================
-- 10. COURSE GAMIFICATION & AURA POINTS REWARD AWARDS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.aura_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    awarded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    awarded_by_name TEXT,
    awarded_by_role TEXT, -- 'teacher' | 'admin' | 'master_admin'
    points INTEGER NOT NULL CHECK (points > 0),
    reason TEXT NOT NULL,
    category TEXT DEFAULT 'performance', -- 'participation', 'excellence', 'creativity', 'mentorship', 'hackathon', 'streak', 'bug_hunt'
    badge_icon TEXT DEFAULT 'sparkles',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aura_awards_student ON public.aura_awards(student_id);
CREATE INDEX IF NOT EXISTS idx_aura_awards_course ON public.aura_awards(course_id);
CREATE INDEX IF NOT EXISTS idx_aura_awards_awarded_by ON public.aura_awards(awarded_by);

ALTER TABLE public.aura_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view aura awards" ON public.aura_awards;
DROP POLICY IF EXISTS "Teachers and admins can award aura" ON public.aura_awards;

-- Public and authenticated students can view aura awards for gamified leaderboards
CREATE POLICY "Anyone can view aura awards" ON public.aura_awards
    FOR SELECT TO anon, authenticated
    USING (true);

-- Strictly teachers and admins can award aura points; students cannot self-award
CREATE POLICY "Teachers and admins can award aura" ON public.aura_awards
    FOR INSERT TO authenticated
    WITH CHECK (
        student_id != auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('teacher', 'admin', 'master_admin', 'super_admin')
        )
    );

-- ── 11. ANTI-PRIVILEGE ESCALATION TRIGGER ON USERS ────────────────────────────
CREATE OR REPLACE FUNCTION public.check_user_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'master_admin', 'super_admin')
        ) THEN
            NEW.role := OLD.role;
            NEW.status := OLD.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.users;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_role_escalation();

-- ── 15. FLASHCARDS, MNEMONICS & ATTENDANCE CLEARANCE SETUP ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    category TEXT,
    icon TEXT DEFAULT '⚡',
    color TEXT DEFAULT 'from-blue-600 to-indigo-700',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view flashcard decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Teachers and admins manage flashcard decks" ON public.flashcard_decks;

CREATE POLICY "Anyone can view flashcard decks" ON public.flashcard_decks
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Teachers and admins manage flashcard decks" ON public.flashcard_decks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
            AND users.role IN ('teacher', 'admin', 'super_admin', 'master_admin')
        )
        OR created_by = (SELECT auth.uid())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
            AND users.role IN ('teacher', 'admin', 'super_admin', 'master_admin')
        )
        OR created_by = (SELECT auth.uid())
    );

CREATE TABLE IF NOT EXISTS public.flashcards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    deck_id TEXT REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    hint TEXT,
    category TEXT,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Teachers and admins manage flashcards" ON public.flashcards;

CREATE POLICY "Anyone can view flashcards" ON public.flashcards
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Teachers and admins manage flashcards" ON public.flashcards
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
            AND users.role IN ('teacher', 'admin', 'super_admin', 'master_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
            AND users.role IN ('teacher', 'admin', 'super_admin', 'master_admin')
        )
    );

CREATE TABLE IF NOT EXISTS public.mnemonics (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'acronym' CHECK (type IN ('acronym', 'chunking', 'visual', 'rhyming', 'story')),
    acronym TEXT,
    phrase TEXT,
    subject TEXT,
    category TEXT,
    explanation TEXT,
    breakdown JSONB DEFAULT '[]'::jsonb,
    exam_tip TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mnemonics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mnemonics FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view mnemonics" ON public.mnemonics;
DROP POLICY IF EXISTS "Teachers and admins manage mnemonics" ON public.mnemonics;

CREATE POLICY "Anyone can view mnemonics" ON public.mnemonics
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Teachers and admins manage mnemonics" ON public.mnemonics
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
            AND users.role IN ('teacher', 'admin', 'super_admin', 'master_admin')
        )
        OR created_by = (SELECT auth.uid())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
            AND users.role IN ('teacher', 'admin', 'super_admin', 'master_admin')
        )
        OR created_by = (SELECT auth.uid())
    );

CREATE TABLE IF NOT EXISTS public.attendance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE UNIQUE,
    min_attendance_percent INTEGER DEFAULT 75,
    condonation_allowed BOOLEAN DEFAULT true,
    condonation_min_percent INTEGER DEFAULT 65,
    requires_exam_slip BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_policies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read attendance policies" ON public.attendance_policies;
DROP POLICY IF EXISTS "Faculty and admins manage attendance policies" ON public.attendance_policies;

CREATE POLICY "Anyone can read attendance policies" ON public.attendance_policies
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Faculty and admins manage attendance policies" ON public.attendance_policies
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
            AND users.role IN ('teacher', 'admin', 'super_admin', 'master_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
            AND users.role IN ('teacher', 'admin', 'super_admin', 'master_admin')
        )
    );

CREATE TABLE IF NOT EXISTS public.attendance_clearance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    clearance_status TEXT DEFAULT 'eligible' CHECK (clearance_status IN ('eligible', 'condonation_required', 'debarred')),
    attendance_percentage NUMERIC DEFAULT 100,
    sessions_attended INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    hall_ticket_number TEXT UNIQUE,
    seat_number TEXT,
    hall_number TEXT,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendance_clearance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_clearance_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view own exam clearance records" ON public.attendance_clearance_records;
DROP POLICY IF EXISTS "Faculty and admins manage exam clearance records" ON public.attendance_clearance_records;

CREATE POLICY "Students view own exam clearance records" ON public.attendance_clearance_records
    FOR SELECT TO authenticated
    USING (
        student_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
            AND users.role IN ('teacher', 'admin', 'super_admin', 'master_admin')
        )
    );

CREATE POLICY "Faculty and admins manage exam clearance records" ON public.attendance_clearance_records
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
            AND users.role IN ('teacher', 'admin', 'super_admin', 'master_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = (SELECT auth.uid())
            AND users.role IN ('teacher', 'admin', 'super_admin', 'master_admin')
        )
    );

CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_course_id ON public.flashcards(course_id);
CREATE INDEX IF NOT EXISTS idx_mnemonics_course_id ON public.mnemonics(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clearance_student ON public.attendance_clearance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clearance_course ON public.attendance_clearance_records(course_id);

-- Output Confirmation
SELECT 
    (SELECT COUNT(*) FROM public.colleges) AS total_colleges,
    (SELECT COUNT(*) FROM public.users) AS total_users,
    (SELECT COUNT(*) FROM public.courses) AS total_courses,
    (SELECT COUNT(*) FROM public.enrollments) AS total_enrollments,
    (SELECT COUNT(*) FROM public.invoices) AS total_invoices,
    (SELECT COUNT(*) FROM public.blogs) AS total_blogs,
    (SELECT COUNT(*) FROM public.job_openings) AS total_job_openings,
    (SELECT COUNT(*) FROM public.job_applications) AS total_job_applications,
    (SELECT COUNT(*) FROM public.master_roles) AS total_master_roles,
    (SELECT COUNT(*) FROM public.master_staff) AS total_master_staff,
    (SELECT COUNT(*) FROM public.coupons) AS total_coupons,
    (SELECT COUNT(*) FROM public.aura_awards) AS total_aura_awards;




