-- ==============================================================================================
-- SINVERSE: ASTRAVYUH - KINGDOMS OF KNOWLEDGE SUPABASE DATABASE SCHEMA
-- Lightweight, Clash of Clans-inspired Kingdom Building & Battle Arena
-- ==============================================================================================

-- 1. STUDENT KINGDOMS TABLE
CREATE TABLE IF NOT EXISTS public.astravyuh_kingdoms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    castle_level INTEGER NOT NULL DEFAULT 1 CHECK (castle_level BETWEEN 1 AND 5),
    wall_level INTEGER NOT NULL DEFAULT 1 CHECK (wall_level BETWEEN 1 AND 5),
    tower_level INTEGER NOT NULL DEFAULT 1 CHECK (tower_level BETWEEN 1 AND 5),
    equipped_astra_id TEXT CHECK (equipped_astra_id IN ('agni-astra', 'varuna-astra', 'vajra-astra') OR equipped_astra_id IS NULL),
    active_skin_id TEXT DEFAULT 'skin-tejas',
    active_background_id TEXT DEFAULT 'bg-midnight',
    trophies INTEGER NOT NULL DEFAULT 100,
    battle_wins INTEGER NOT NULL DEFAULT 0,
    battle_losses INTEGER NOT NULL DEFAULT 0,
    last_battle_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for leaderboard queries and matchmaking
CREATE INDEX IF NOT EXISTS idx_astravyuh_kingdoms_trophies ON public.astravyuh_kingdoms(trophies DESC);
CREATE INDEX IF NOT EXISTS idx_astravyuh_kingdoms_student_id ON public.astravyuh_kingdoms(student_id);

-- 2. BATTLE AUDIT & HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.astravyuh_battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attacker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    defender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    attacker_astra_id TEXT,
    defender_astra_id TEXT,
    correct_answers_count INTEGER NOT NULL CHECK (correct_answers_count BETWEEN 0 AND 5),
    total_questions INTEGER NOT NULL DEFAULT 5,
    attack_score INTEGER NOT NULL,
    defense_reduction INTEGER NOT NULL,
    final_damage INTEGER NOT NULL CHECK (final_damage BETWEEN 0 AND 100),
    is_victory BOOLEAN NOT NULL,
    flix_earned INTEGER NOT NULL DEFAULT 0,
    trophies_delta INTEGER NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_astravyuh_battles_attacker ON public.astravyuh_battles(attacker_id);
CREATE INDEX IF NOT EXISTS idx_astravyuh_battles_defender ON public.astravyuh_battles(defender_id);
CREATE INDEX IF NOT EXISTS idx_astravyuh_battles_timestamp ON public.astravyuh_battles(timestamp DESC);

-- 3. FLIX AUDIT & TRANSACTION INTEGRITY LEDGER
CREATE TABLE IF NOT EXISTS public.astravyuh_flix_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_astravyuh_flix_audits_user ON public.astravyuh_flix_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_astravyuh_flix_audits_timestamp ON public.astravyuh_flix_audits(timestamp DESC);

-- 4. GLOBAL GAME SETTINGS & BALANCING
CREATE TABLE IF NOT EXISTS public.astravyuh_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    game_enabled BOOLEAN DEFAULT true,
    victory_threshold INTEGER DEFAULT 60,
    config JSONB DEFAULT '{
      "astraPrices": {
        "agni-astra": 250,
        "varuna-astra": 250,
        "vajra-astra": 350
      },
      "upgradeCosts": {
        "castle": [100, 200, 400, 750],
        "wall": [80, 160, 320, 600],
        "tower": [90, 180, 360, 650]
      },
      "battleRewards": {
        "winFlix": 40,
        "lossFlix": 10,
        "winTrophies": 25,
        "lossTrophies": 5,
        "dailyFlixLimit": 150
      },
      "disabledBatches": []
    }'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default global settings row if missing
INSERT INTO public.astravyuh_settings (id, game_enabled, victory_threshold)
VALUES ('global', true, 60)
ON CONFLICT (id) DO NOTHING;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.astravyuh_kingdoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astravyuh_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astravyuh_flix_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astravyuh_settings ENABLE ROW LEVEL SECURITY;

-- Kingdoms RLS
DROP POLICY IF EXISTS "Anyone can view public kingdoms for matchmaking" ON public.astravyuh_kingdoms;
CREATE POLICY "Anyone can view public kingdoms for matchmaking"
    ON public.astravyuh_kingdoms FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Students manage own kingdom" ON public.astravyuh_kingdoms;
CREATE POLICY "Students manage own kingdom"
    ON public.astravyuh_kingdoms FOR ALL
    TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Admins full access to kingdoms" ON public.astravyuh_kingdoms;
CREATE POLICY "Admins full access to kingdoms"
    ON public.astravyuh_kingdoms FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'master_admin')
        )
    );

-- Battles RLS
DROP POLICY IF EXISTS "Users can view battles they were involved in" ON public.astravyuh_battles;
CREATE POLICY "Users can view battles they were involved in"
    ON public.astravyuh_battles FOR SELECT
    TO authenticated
    USING (attacker_id = auth.uid() OR defender_id = auth.uid());

DROP POLICY IF EXISTS "Attacker can record battle outcome" ON public.astravyuh_battles;
CREATE POLICY "Attacker can record battle outcome"
    ON public.astravyuh_battles FOR INSERT
    TO authenticated
    WITH CHECK (attacker_id = auth.uid() AND attacker_id <> defender_id);

DROP POLICY IF EXISTS "Admins full access to battles" ON public.astravyuh_battles;
CREATE POLICY "Admins full access to battles"
    ON public.astravyuh_battles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'master_admin', 'teacher')
        )
    );

-- Flix Audits RLS
DROP POLICY IF EXISTS "Users can view their own flix audits" ON public.astravyuh_flix_audits;
CREATE POLICY "Users can view their own flix audits"
    ON public.astravyuh_flix_audits FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins full access to flix audits" ON public.astravyuh_flix_audits;
CREATE POLICY "Admins full access to flix audits"
    ON public.astravyuh_flix_audits FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'master_admin')
        )
    );

-- Settings RLS
DROP POLICY IF EXISTS "Anyone can read game settings" ON public.astravyuh_settings;
CREATE POLICY "Anyone can read game settings"
    ON public.astravyuh_settings FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Only Admins can update game settings" ON public.astravyuh_settings;
CREATE POLICY "Only Admins can update game settings"
    ON public.astravyuh_settings FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin', 'master_admin')
        )
    );

-- ==============================================================================================
-- ROLLBACK SCRIPT (Execute if feature rollback is ever required)
-- ==============================================================================================
-- DROP TABLE IF EXISTS public.astravyuh_flix_audits CASCADE;
-- DROP TABLE IF EXISTS public.astravyuh_battles CASCADE;
-- DROP TABLE IF EXISTS public.astravyuh_kingdoms CASCADE;
-- DROP TABLE IF EXISTS public.astravyuh_settings CASCADE;
