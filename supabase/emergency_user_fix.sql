-- EMERGENCY FIX FOR USER CREATION (500 Error)
-- Run this script to fix the likely cause: 'institute_id' column still existing and being NOT NULL.

-- 1. First, try to make the column nullable (in case we can't drop it for some reason)
-- This allows the INSERT to succeed even if the column exists and we don't provide a value.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'institute_id') THEN
        ALTER TABLE public.users ALTER COLUMN institute_id DROP NOT NULL;
    END IF;
END $$;

-- 2. Now attempt to DROP the column entirely with CASCADE to remove dependencies
ALTER TABLE public.users DROP COLUMN IF EXISTS institute_id CASCADE;

-- 3. Drop existing trigger to ensure a clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. Re-create the Trigger Function (Simplified and Robust)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    -- Safe role handling
    CASE 
       WHEN LOWER(TRIM((new.raw_user_meta_data->>'role')::text)) = 'teacher' THEN 'teacher'::user_role
       WHEN LOWER(TRIM((new.raw_user_meta_data->>'role')::text)) = 'admin' THEN 'admin'::user_role
       ELSE 'student'::user_role
    END
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log the error to the Postgres log (visible in Supabase Dashboard -> Database -> Postgres Logs)
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  -- Reraise to ensure the auth user creation also fails (so we don't get orphaned auth users)
  RAISE; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-attach the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Ensure existing users have a valid role (Fix any broken data)
UPDATE public.users SET role = 'student' WHERE role IS NULL;

-- 7. Grant Permissions again (just to be safe)
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.users TO postgres;
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;
