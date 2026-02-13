-- DIAGNOSTIC & FIX SCRIPT
-- 1. Check if 'institute_id' exists and drop it (Forcefully)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'institute_id') THEN
        ALTER TABLE public.users DROP COLUMN institute_id CASCADE;
    END IF;
END $$;

-- 2. Drop Trigger/Function to reset
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Create a "Safe Mode" Trigger
-- This version will NOT crash (500). If it fails to parse data, it inserts a default user so we can see it happened.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  v_full_name TEXT;
  v_role_str TEXT;
  v_role_enum user_role;
BEGIN
  -- 1. Extract Name (Safe)
  BEGIN
    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Unnamed User');
  EXCEPTION WHEN OTHERS THEN
    v_full_name := 'Error Parsing Name';
  END;

  -- 2. Extract Role (Safe)
  BEGIN
    v_role_str := LOWER(TRIM(COALESCE(new.raw_user_meta_data->>'role', 'student')));
    
    IF v_role_str = 'admin' THEN v_role_enum := 'admin';
    ELSIF v_role_str = 'teacher' THEN v_role_enum := 'teacher';
    ELSE v_role_enum := 'student';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_role_enum := 'student'; -- Fallback
  END;

  -- 3. Insert
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (new.id, new.email, v_full_name, v_role_enum);

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- If the INSERT itself fails (e.g. constraint violation), we catch it here.
  -- We try to insert a "Emergency" record logging the error in the name, 
  -- so the Auth user is created and checking the public table reveals the issue.
  BEGIN
      INSERT INTO public.users (id, email, full_name, role)
      VALUES (new.id, new.email, 'INSERT FAILED: ' || SQLERRM, 'student');
  EXCEPTION WHEN OTHERS THEN
      -- If even THAT fails, we must verify if public.users is completely broken.
      RAISE WARNING 'Catastrophic failure in handle_new_user: %', SQLERRM;
      -- Returning NEW allows Auth user creation to proceed even if public user creation fails. 
      -- This avoids the 500 error for the end user, but leaves data out of sync.
      -- This is useful for debugging now.
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Grant Permissions (Crucial)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO postgres, service_role;
-- Explicitly grant insert to authenticated (though trigger runs as owner/postgres usually)
GRANT ALL ON TABLE public.users TO authenticated;
