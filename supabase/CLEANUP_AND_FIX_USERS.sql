-- ====================================================================
-- SUPABASE FIX: RESOLVE FOREIGN KEY CONSTRAINTS (daily_quotes) & USER CLEANUP
-- ====================================================================
-- Run this script in your Supabase SQL Editor (https://app.supabase.com -> SQL Editor)

-- 1. Fix Foreign Key Constraints on daily_quotes table so deletion doesn't fail
DO $$
BEGIN
    -- Drop constraint on daily_quotes if it references users or auth.users
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_quotes_created_by_fkey'
    ) THEN
        ALTER TABLE public.daily_quotes DROP CONSTRAINT daily_quotes_created_by_fkey;
    END IF;
END $$;

-- Re-add constraint with ON DELETE SET NULL
ALTER TABLE public.daily_quotes 
  ADD CONSTRAINT daily_quotes_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Nullify or clean up any orphan daily_quotes references
UPDATE public.daily_quotes 
SET created_by = NULL 
WHERE created_by NOT IN (SELECT id FROM auth.users);

-- 3. Automatic deletion sync trigger between public.users and auth.users
CREATE OR REPLACE FUNCTION public.on_public_user_deleted()
RETURNS trigger AS $$
BEGIN
  -- PROTECT ADMIN ACCOUNTS: Do NOT delete admin accounts from auth.users
  IF OLD.role IN ('admin', 'super_admin') THEN
    RETURN OLD;
  END IF;

  -- Clean up daily quotes created by deleted user
  UPDATE public.daily_quotes SET created_by = NULL WHERE created_by = OLD.id;

  -- Delete matching student/teacher user from auth.users when deleted from public.users
  DELETE FROM auth.users 
  WHERE (id = OLD.id OR email = OLD.email)
    AND COALESCE(raw_user_meta_data->>'role', '') NOT IN ('admin', 'super_admin');
    
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS tr_public_user_deleted ON public.users;
CREATE TRIGGER tr_public_user_deleted
  AFTER DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.on_public_user_deleted();

-- 4. Clean up ONLY student/teacher orphan accounts from auth.users
-- ABSOLUTELY PRESERVES ALL ADMIN ACCOUNTS
DELETE FROM auth.users 
WHERE email NOT IN (SELECT email FROM public.users WHERE email IS NOT NULL)
  AND COALESCE(raw_user_meta_data->>'role', '') NOT IN ('admin', 'super_admin')
  AND email NOT LIKE '%admin%';

-- 5. Ensure public.users table schema integrity
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Output confirmation message
SELECT 'Foreign key constraints fixed successfully. Admin accounts preserved. Student/Teacher orphans cleaned.' AS result;
