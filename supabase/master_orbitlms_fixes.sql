-- ============================================================
-- MASTER SQL FIXES & MIGRATIONS FOR ORBIT LMS (FULLY IDEMPOTENT)
-- Execute this script in your Supabase SQL Editor to apply all fixes cleanly.
-- ============================================================

-- ── 1. ENROLLMENTS RLS FIX (Student verification & approval) ──
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enrollments_own" ON public.enrollments;
DROP POLICY IF EXISTS "Student view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "student_insert_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "admin_insert_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "admin_update_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "admin_delete_enrollment" ON public.enrollments;
DROP POLICY IF EXISTS "admin_view_all_enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admin manage enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teacher view enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teacher manage enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teacher manage enrollments for their courses" ON public.enrollments;
DROP POLICY IF EXISTS "Teacher update/delete enrollments for their courses" ON public.enrollments;

DROP POLICY IF EXISTS "Students can enroll themselves" ON public.enrollments;
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can view course enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can update course enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can delete course enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Admins manage all enrollments" ON public.enrollments;

CREATE POLICY "Students can enroll themselves"
  ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own enrollments"
  ON public.enrollments FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view course enrollments"
  ON public.enrollments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
      AND (courses.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = courses.id AND cc.teacher_id = auth.uid()
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
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = courses.id AND cc.teacher_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
      AND (courses.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = courses.id AND cc.teacher_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Teachers can delete course enrollments"
  ON public.enrollments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = enrollments.course_id
      AND (courses.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = courses.id AND cc.teacher_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Admins manage all enrollments"
  ON public.enrollments FOR ALL TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');


-- ── 2. SECTION PROGRESS RLS FIX (Lesson Completion) ──
ALTER TABLE public.section_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own progress" ON public.section_progress;
DROP POLICY IF EXISTS "Students select own progress" ON public.section_progress;
DROP POLICY IF EXISTS "Students insert own progress" ON public.section_progress;
DROP POLICY IF EXISTS "Students update own progress" ON public.section_progress;
DROP POLICY IF EXISTS "Teachers view student progress" ON public.section_progress;

CREATE POLICY "Students manage own progress" ON public.section_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers view student progress" ON public.section_progress
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.section_contents sc
      JOIN public.course_sections cs ON cs.id = sc.section_id
      JOIN public.courses c ON c.id = cs.course_id
      WHERE sc.id = section_progress.content_id
      AND (c.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = c.id AND cc.teacher_id = auth.uid()
      ))
    )
  );


-- ── 3. QUIZ ATTEMPTS & QUIZ ANSWERS RLS FIX ──
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students insert own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Students select own quiz attempts" ON public.quiz_attempts;
DROP POLICY IF EXISTS "Teachers view course quiz attempts" ON public.quiz_attempts;

CREATE POLICY "Students manage own quiz attempts" ON public.quiz_attempts
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers view course quiz attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = quiz_attempts.assignment_id
      AND (c.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = c.id AND cc.teacher_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "Students manage own quiz answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Students insert own quiz answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Students select own quiz answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Teachers view course quiz answers" ON public.quiz_answers;

CREATE POLICY "Students manage own quiz answers" ON public.quiz_answers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_answers.attempt_id
      AND qa.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      WHERE qa.id = quiz_answers.attempt_id
      AND qa.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers view course quiz answers" ON public.quiz_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quiz_attempts qa
      JOIN public.assignments a ON a.id = qa.assignment_id
      JOIN public.courses c ON c.id = a.course_id
      WHERE qa.id = quiz_answers.attempt_id
      AND (c.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = c.id AND cc.teacher_id = auth.uid()
      ))
    )
  );


-- ── 4. SUBMISSIONS TABLE RLS FIX (Assignment Submissions) ──
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers view course submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers grade course submissions" ON public.submissions;

CREATE POLICY "Students manage own submissions" ON public.submissions
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers view course submissions" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = submissions.assignment_id
      AND (c.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = c.id AND cc.teacher_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Teachers grade course submissions" ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = submissions.assignment_id
      AND (c.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = c.id AND cc.teacher_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = submissions.assignment_id
      AND (c.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = c.id AND cc.teacher_id = auth.uid()
      ))
    )
  );


-- ── 5. NEW COLUMNS (Credits, Aura Points, Min Watch Percent, Drive URL) ──
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS min_watch_percent INTEGER DEFAULT 80;

ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS credit_points INTEGER DEFAULT 3;

ALTER TABLE public.course_sections 
ADD COLUMN IF NOT EXISTS aura_points INTEGER DEFAULT 10;

ALTER TABLE public.section_contents 
ADD COLUMN IF NOT EXISTS min_watch_percent INTEGER DEFAULT NULL;

ALTER TABLE public.section_contents 
ADD COLUMN IF NOT EXISTS aura_points INTEGER DEFAULT 5;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS aura_points INTEGER DEFAULT 0;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS custom_badge TEXT DEFAULT NULL;

ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT TRUE;

ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS teacher_drive_url TEXT DEFAULT NULL;

ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS submission_mode TEXT DEFAULT 'both';


-- ── 6. LIVE CLASSES TABLE & RLS ──
CREATE TABLE IF NOT EXISTS public.live_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_link TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  description TEXT,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view enrolled live classes" ON public.live_classes;
DROP POLICY IF EXISTS "Teachers manage own live classes" ON public.live_classes;
DROP POLICY IF EXISTS "Admins manage all live classes" ON public.live_classes;

CREATE POLICY "Students view enrolled live classes" ON public.live_classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = live_classes.course_id
      AND e.student_id = auth.uid()
      AND e.status = 'approved'
    )
  );

CREATE POLICY "Teachers manage own live classes" ON public.live_classes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = live_classes.course_id
      AND (c.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = c.id AND cc.teacher_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = live_classes.course_id
      AND (c.teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.course_collaborators cc WHERE cc.course_id = c.id AND cc.teacher_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Admins manage all live classes" ON public.live_classes
  FOR ALL TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');


-- ── 7. CALENDAR EVENTS TYPE CHECK CONSTRAINT FIX ──
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_type_check 
  CHECK (type IN ('event', 'exam', 'holiday', 'live_class', 'deadline', 'announcement'));


-- ── 8. COURSE COLLABORATORS TABLE & RLS ──
CREATE TABLE IF NOT EXISTS public.course_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'co-teacher',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, teacher_id)
);

ALTER TABLE public.course_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select course_collaborators" ON public.course_collaborators;
DROP POLICY IF EXISTS "Teachers manage course_collaborators" ON public.course_collaborators;

CREATE POLICY "Public select course_collaborators" ON public.course_collaborators
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers manage course_collaborators" ON public.course_collaborators
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_collaborators.course_id
      AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_collaborators.course_id
      AND c.teacher_id = auth.uid()
    )
  );


-- ── 9. CERTIFICATE SPECIALIZATION PROGRAMS ──
CREATE TABLE IF NOT EXISTS public.certificate_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  total_credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.program_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.certificate_programs(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER DEFAULT 0,
  UNIQUE(program_id, course_id)
);

ALTER TABLE public.certificate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view certificate programs" ON public.certificate_programs;
DROP POLICY IF EXISTS "Teachers manage certificate programs" ON public.certificate_programs;
DROP POLICY IF EXISTS "Public view program courses" ON public.program_courses;
DROP POLICY IF EXISTS "Teachers manage program courses" ON public.program_courses;

CREATE POLICY "Public view certificate programs" ON public.certificate_programs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers manage certificate programs" ON public.certificate_programs
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid() OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  WITH CHECK (teacher_id = auth.uid() OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Public view program courses" ON public.program_courses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teachers manage program courses" ON public.program_courses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.certificate_programs cp
      WHERE cp.id = program_courses.program_id
      AND (cp.teacher_id = auth.uid() OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
    )
  );

-- ── 12. ENROLLMENT COMPLETION & ADMIN CREDIT OVERRIDE ──
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bonus_credits INTEGER DEFAULT 0;

-- ── 13. DOMAIN & PRE-ENROLLMENT COURSE METADATA ──
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'Software Engineering';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS objectives TEXT DEFAULT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructions TEXT DEFAULT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_intro TEXT DEFAULT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS exam_policy TEXT DEFAULT NULL;
-- ── 14. ADMIN CREDIT POLICY & DOMAIN CERTIFICATION THRESHOLD ──
CREATE TABLE IF NOT EXISTS public.credit_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_cert_credits INTEGER DEFAULT 20,
    default_course_credits INTEGER DEFAULT 3,
    policy_statement TEXT DEFAULT '1. Every course carries specific Academic Credit Points. 2. Credits accumulate automatically across courses within the same domain. 3. Completing 20 Credits in a single domain qualifies the student for an official Domain Mastery Certification.',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credit_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone view credit policies" ON public.credit_policies;
DROP POLICY IF EXISTS "Admin manage credit policies" ON public.credit_policies;

CREATE POLICY "Anyone view credit policies" ON public.credit_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage credit policies" ON public.credit_policies FOR ALL TO authenticated USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- ── 15. LINKEDIN-STYLE QUALIFICATIONS & INSTRUCTOR AVATAR MEDIA ──
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS qualifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instructor_video_url TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS instructor_socials JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_qualifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_video_url TEXT DEFAULT NULL;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_socials JSONB DEFAULT '{}'::jsonb;

-- ── 16. NOTIFICATION DISPATCH RPC FUNCTION (x_n_c_s) ──
CREATE OR REPLACE FUNCTION public.x_n_c_s(
    p_course_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_notification_type TEXT DEFAULT 'course',
    p_sender_id UUID DEFAULT NULL,
    p_sender_role TEXT DEFAULT 'teacher',
    p_priority INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    r RECORD;
BEGIN
    FOR r IN (
        SELECT DISTINCT student_id 
        FROM public.enrollments 
        WHERE course_id = p_course_id
    ) LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            sender_role,
            is_read,
            created_at
        ) VALUES (
            r.student_id,
            p_title,
            p_message,
            p_notification_type,
            p_sender_role,
            false,
            NOW()
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- ── 17. OFFICIAL INSTITUTIONAL LETTERHEAD NOTICES & STUDENT ID CARDS ──
CREATE TABLE IF NOT EXISTS public.letterhead_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_no TEXT NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    target_audience TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    sender_type TEXT DEFAULT 'teacher',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.letterhead_notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone view notices" ON public.letterhead_notices;
DROP POLICY IF EXISTS "Auth users create notices" ON public.letterhead_notices;

CREATE POLICY "Anyone view notices" ON public.letterhead_notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users create notices" ON public.letterhead_notices FOR INSERT TO authenticated WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ── 18. TEACHER BRANDING, LETTERHEAD SIGNATURES & WEEKLY COURSE STRUCTURE ──
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS signature_url TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_logo_url TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_tagline TEXT DEFAULT NULL;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS structuring_approach TEXT DEFAULT 'weekly';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration_hours NUMERIC DEFAULT 0;

ALTER TABLE public.course_sections ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT NULL;
ALTER TABLE public.course_sections ADD COLUMN IF NOT EXISTS allocated_hours NUMERIC DEFAULT 0;
ALTER TABLE public.course_sections ADD COLUMN IF NOT EXISTS topic_name TEXT DEFAULT NULL;

ALTER TABLE public.section_contents ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;

NOTIFY pgrst, 'reload schema';

-- ── 19. LIVE CLASS MODULE MAPPING & DYNAMIC DURATION CALCULATION ──
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.course_sections(id) ON DELETE SET NULL;
ALTER TABLE public.live_classes ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
ALTER TABLE public.section_contents ADD COLUMN IF NOT EXISTS live_class_id UUID REFERENCES public.live_classes(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';

-- ── 20. URGENT NOTIFICATION PRIORITY SYSTEM & LIVE CLASS EDIT SUPPORT ──
-- Add priority column to notifications for urgent popup filtering
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
-- Index for fast urgent notification lookup
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(user_id, is_read, priority);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(user_id, is_read, notification_type);

-- Update the x_n_c_s RPC to properly use p_priority
DROP FUNCTION IF EXISTS public.x_n_c_s(UUID, TEXT, TEXT, TEXT, UUID, TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.x_n_c_s(
    p_course_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_notification_type TEXT DEFAULT 'course',
    p_sender_id UUID DEFAULT NULL,
    p_sender_role TEXT DEFAULT 'teacher',
    p_priority INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    r RECORD;
BEGIN
    FOR r IN (
        SELECT DISTINCT student_id 
        FROM public.enrollments 
        WHERE course_id = p_course_id
    ) LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            sender_role,
            priority,
            is_read,
            created_at
        ) VALUES (
            r.student_id,
            p_title,
            p_message,
            p_notification_type,
            p_sender_role,
            p_priority,
            false,
            NOW()
        );
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ── 21. EXAM PAPER PERSISTENCE & JSON TEMPLATE STORAGE ──
CREATE TABLE IF NOT EXISTS public.exam_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    exam_title TEXT NOT NULL DEFAULT 'Final Comprehensive Examination',
    course_code TEXT,
    duration_hours TEXT DEFAULT '3 Hours',
    max_marks INTEGER DEFAULT 100,
    instructions JSONB DEFAULT '[]'::jsonb,
    questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add basic policies
ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.exam_papers;
DROP POLICY IF EXISTS "Enable write access for teachers and admins" ON public.exam_papers;

CREATE POLICY "Enable read access for authenticated users" ON public.exam_papers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for teachers and admins" ON public.exam_papers
    FOR ALL TO authenticated USING (true);

-- ── 22. CONTACT MESSAGES & LANDING PAGE INQUIRIES ──
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'Student',
    college_name TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread', -- 'unread', 'read', 'replied'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;

-- Allow public / any visitor to submit Get In Touch contact messages
CREATE POLICY "Anyone can insert contact messages" ON public.contact_messages
    FOR INSERT TO public WITH CHECK (true);

-- Allow Admins and Master Admins to view all contact messages
CREATE POLICY "Admins can view contact messages" ON public.contact_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role::text IN ('admin', 'master_admin')
        )
    );

-- Allow Admins and Master Admins to update message status
CREATE POLICY "Admins can update contact messages" ON public.contact_messages
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role::text IN ('admin', 'master_admin')
        )
    );

-- Ensure is_published and duration_weeks exist on courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT 4;

-- ── 24. LIVE CLASSES & ATTENDANCE MAPPING ──
CREATE TABLE IF NOT EXISTS public.live_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    meeting_link TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    live_class_id UUID REFERENCES public.live_classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'present',
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS live_class_id UUID REFERENCES public.live_classes(id) ON DELETE CASCADE;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.attendance;
DROP POLICY IF EXISTS "Enable write access for teachers and admins" ON public.attendance;

CREATE POLICY "Enable read access for authenticated users" ON public.attendance
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for teachers and admins" ON public.attendance
    FOR ALL TO authenticated USING (true);

-- ── 25. INSTRUCTOR ORGANIZATION, DOMAIN & LEARNING STREAKS MIGRATION ──
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_organization TEXT DEFAULT 'Orbit Academic Council';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS partner_organizations TEXT[] DEFAULT ARRAY['Orbit Academic Council']::TEXT[];
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS instructor_domain TEXT DEFAULT 'Computer Science & Software Engineering';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_deletion_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS highest_streak INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS unlocked_themes TEXT[] DEFAULT ARRAY['default', 'dark', 'system']::TEXT[];

NOTIFY pgrst, 'reload schema';

