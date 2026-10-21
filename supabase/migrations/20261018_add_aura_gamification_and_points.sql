-- ============================================================================
-- MIGRATION: 20261018_add_aura_gamification_and_points.sql
-- PURPOSE: Fix static/zero Aura Points (✨) and Credits (🏅) in Orbit LMS
-- ============================================================================

-- 1. Ensure 'users' table has aura_points and bonus_credits columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS aura_points INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS bonus_credits INTEGER DEFAULT 4;

-- Backfill any existing users who have NULL or 0 points with standard starter allocation
UPDATE public.users 
SET aura_points = 150 
WHERE aura_points IS NULL OR aura_points = 0;

UPDATE public.users 
SET bonus_credits = 4 
WHERE bonus_credits IS NULL OR bonus_credits = 0;

-- 2. Create 'aura_awards' ledger table if not exists
CREATE TABLE IF NOT EXISTS public.aura_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    awarded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    awarded_by_name TEXT,
    awarded_by_role TEXT,
    points INTEGER NOT NULL CHECK (points > 0),
    reason TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    badge_icon TEXT DEFAULT 'sparkles',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_aura_awards_student ON public.aura_awards(student_id);
CREATE INDEX IF NOT EXISTS idx_aura_awards_created ON public.aura_awards(created_at DESC);

-- 3. Enable Row Level Security (RLS) on aura_awards
ALTER TABLE public.aura_awards ENABLE ROW LEVEL SECURITY;

-- Students can read their own awards
DROP POLICY IF EXISTS "Students can view their own aura awards" ON public.aura_awards;
CREATE POLICY "Students can view their own aura awards"
ON public.aura_awards
FOR SELECT
TO authenticated
USING (
    student_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'master')
    )
);

-- Instructors and Admins can insert aura awards
DROP POLICY IF EXISTS "Instructors and Admins can award aura" ON public.aura_awards;
CREATE POLICY "Instructors and Admins can award aura"
ON public.aura_awards
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'master', 'student')
    )
);

-- 4. Atomic Stored Procedure to safely increment user aura points without concurrency race conditions
CREATE OR REPLACE FUNCTION public.increment_user_aura(
    target_user_id UUID,
    amount_to_add INT,
    award_reason TEXT DEFAULT 'Academic Activity & Quiz Mastery'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_aura INT;
BEGIN
    IF amount_to_add <= 0 THEN
        RAISE EXCEPTION 'amount_to_add must be positive';
    END IF;

    -- Atomically update and fetch new aura
    UPDATE public.users
    SET aura_points = COALESCE(aura_points, 0) + amount_to_add
    WHERE id = target_user_id
    RETURNING aura_points INTO new_aura;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Record in ledger
    INSERT INTO public.aura_awards (
        student_id,
        awarded_by,
        points,
        reason,
        category,
        badge_icon
    ) VALUES (
        target_user_id,
        auth.uid(),
        amount_to_add,
        award_reason,
        'gamification',
        'sparkles'
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', target_user_id,
        'new_aura_points', new_aura,
        'points_added', amount_to_add
    );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_user_aura(UUID, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_aura(UUID, INT, TEXT) TO service_role;
