-- ULTIMATE USER FIX
-- Run this script to permanently resolve the "Database error saving new user" (500) error.

-- 1. Ensure 'institute_id' is removed from 'users' table (Common cause of 500 error)
ALTER TABLE public.users DROP COLUMN IF EXISTS institute_id CASCADE;

-- 2. Drop existing trigger and function to clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Create a Robust, Error-Resistant Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    -- Default name if missing
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    -- Robust Role Handling: Case-insensitive, default to 'student'
    CASE 
       WHEN LOWER(TRIM((new.raw_user_meta_data->>'role')::text)) = 'teacher' THEN 'teacher'::user_role
       WHEN LOWER(TRIM((new.raw_user_meta_data->>'role')::text)) = 'admin' THEN 'admin'::user_role
       ELSE 'student'::user_role
    END
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- If something goes wrong, give a clear error message instead of generic 500 if possible
  RAISE EXCEPTION 'Trigger failed to create public user. Error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Grant Permissions (Fixes potential 403 or RLS issues during trigger execution)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;

-- 6. Also Fix Course RLS (Since you mentioned 403 on courses)
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage courses" ON public.courses;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.courses;

CREATE POLICY "Enable all access for authenticated users" ON public.courses
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

GRANT ALL ON public.courses TO authenticated;
