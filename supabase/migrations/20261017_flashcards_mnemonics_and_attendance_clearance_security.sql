-- ==============================================================================================
-- ORBIT LMS - FLASHCARDS, MNEMONICS & ATTENDANCE CLEARANCE WITH DEFENSIVE ROW-LEVEL SECURITY (RLS)
-- Security Standard: Follows webapp-security-audit.skill & Supabase Security Hardening Guidelines
-- ==============================================================================================

-- 1. FLASHCARD DECKS TABLE
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

-- Read policy: Anyone authenticated or anonymous can view educational decks
CREATE POLICY "Anyone can view flashcard decks" ON public.flashcard_decks
    FOR SELECT TO anon, authenticated
    USING (true);

-- Write policy: Authenticated teachers, admins, and deck owners can insert/update/delete
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

-- 2. FLASHCARDS TABLE
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
    FOR SELECT TO anon, authenticated
    USING (true);

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

-- 3. MNEMONICS TABLE (Cognitive memory aids)
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
    FOR SELECT TO anon, authenticated
    USING (true);

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

-- 4. ATTENDANCE POLICIES TABLE (Course-level minimum requirements & admit slip rules)
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
    FOR SELECT TO anon, authenticated
    USING (true);

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

-- 5. ATTENDANCE CLEARANCE & EXAMINATION HALL TICKET RECORDS
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

-- Students can ONLY view their own records (Zero IDOR exposure)
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

-- Faculty and institutional administrators have management oversight
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

-- Indexes for maximum query performance & cached auth.uid() execution
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_course_id ON public.flashcards(course_id);
CREATE INDEX IF NOT EXISTS idx_mnemonics_course_id ON public.mnemonics(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clearance_student ON public.attendance_clearance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_clearance_course ON public.attendance_clearance_records(course_id);
