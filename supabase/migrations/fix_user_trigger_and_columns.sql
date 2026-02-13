
-- 1. Ensure 'users' table has all necessary columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS aadhar_number TEXT,
ADD COLUMN IF NOT EXISTS mobile_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Update the handle_new_user trigger function to insert all fields
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    role,
    status,
    department,
    aadhar_number,
    mobile_number,
    address
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown User'), 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'),
    COALESCE(new.raw_user_meta_data->>'status', 'pending'),
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'aadhar_number',
    new.raw_user_meta_data->>'mobile_number',
    new.raw_user_meta_data->>'address'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger is actually attached (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
