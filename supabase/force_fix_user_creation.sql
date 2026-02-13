-- FORCE FIX: User Creation Error
-- Run this ENTIRE script in the Supabase SQL Editor to resolve the 'Database error saving new user' issue.

-- 1. Disable the trigger momentarily to prevent interference during setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Ensure the 'users' table structure is correct (remove institute_id if it exists)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'institute_id') THEN
        ALTER TABLE public.users DROP COLUMN institute_id CASCADE;
    END IF;
END $$;

-- 3. Verify ENUM types exist (just in case)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
    END IF;
END $$;

-- 4. Create a robust handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    -- Safely cast role, default to 'student' if missing or invalid
    CASE 
      WHEN (new.raw_user_meta_data->>'role') = 'admin' THEN 'admin'::user_role
      WHEN (new.raw_user_meta_data->>'role') = 'teacher' THEN 'teacher'::user_role
      ELSE 'student'::user_role
    END
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error (optional, but good for debugging if you have access to Postgres logs)
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  -- We return NEW so auth user is created even if public user fails (though ideally we want both or neither)
  -- But for 'Database error', we usually want to bubble up the error so the UI knows.
  -- Let's NOT catch it here so the transaction fails and we see the error. 
  -- Re-raising:
  RAISE; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-enable the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Grant necessary permissions (just in case)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated; -- Students/Teachers need this
