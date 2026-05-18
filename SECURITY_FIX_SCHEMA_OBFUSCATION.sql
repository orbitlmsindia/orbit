-- SECURITY FIX: OBFUSCATE EXPOSED SCHEMA ELEMENTS & ENFORCE RLS
-- Run this in your Supabase SQL Editor

-- 1. Ensure RLS is active on ALL listed tables so attackers cannot exploit the exposed names.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        EXECUTE 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;';
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        EXECUTE 'ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;';
    END IF;
END $$;

-- 2. Rename Sensitive Internal RPC Functions to obfuscated identifiers
DO $$ 
BEGIN 
    -- Obfuscate grade_quiz_attempt -> x_q_grd
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'grade_quiz_attempt') THEN
        ALTER FUNCTION public.grade_quiz_attempt(UUID) RENAME TO x_q_grd;
    END IF;
    
    -- Obfuscate notify_course_students -> x_n_c_s
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'notify_course_students') THEN
        ALTER FUNCTION public.notify_course_students(UUID, TEXT, TEXT, TEXT, UUID, TEXT, INTEGER, UUID) RENAME TO x_n_c_s;
    END IF;
    
    -- Obfuscate log_audit_action -> x_a_log
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'log_audit_action') THEN
        ALTER FUNCTION public.log_audit_action(TEXT, TEXT, UUID, JSONB) RENAME TO x_a_log;
    END IF;
END $$;
