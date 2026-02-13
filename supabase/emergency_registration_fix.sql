-- STEP 1: Fix the Table (Run this first)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;

-- STEP 2: Fix the Trigger (Run this next)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, status, department)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown User'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'),
    COALESCE(new.raw_user_meta_data->>'status', 'pending'),
    new.raw_user_meta_data->>'department'
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Assuming the user ID conflict is the main issue to ignore, but for debugging we want to know.
  -- Retrying update if insert fails due to race condition or conflict
  UPDATE public.users 
  SET 
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', full_name),
    role = COALESCE((new.raw_user_meta_data->>'role')::user_role, role),
    status = COALESCE(new.raw_user_meta_data->>'status', status)
  WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
