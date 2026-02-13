-- DEBUG SCRIPT
-- 1. Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop existing function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Ensure institute_id is gone
ALTER TABLE public.users DROP COLUMN IF EXISTS institute_id CASCADE;

-- 4. Create a SIMPLIFIED function to rule out data issues
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    'Debug User', -- Hardcode for testing
    'student'     -- Hardcode for testing
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-enable trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
