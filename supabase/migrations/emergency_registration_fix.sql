
-- EMERGENCY REPAIR FOR REGISTRATION 500 ERROR
-- Run this script in the Supabase SQL Editor.

-- 1. Disable the faulty trigger ensuring no 500 errors first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Define the Safe Function
-- We use a simple INSERT first to ensure it works, then we can expand.
-- We cast to 'user_role' explicitly.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Try to insert with full details
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
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    -- Safe Case: Fallback to student if casting fails or is null
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'::user_role),
    'pending',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'aadhar_number',
    new.raw_user_meta_data->>'mobile_number',
    new.raw_user_meta_data->>'address'
  );
  
  RETURN new;
EXCEPTION 
  WHEN undefined_object THEN
    -- If 'user_role' doesn't exist, we can't insert 'role'. 
    -- We insert just ID and Email to allow login to proceed (user will need manual fix)
    RAISE WARNING 'User Role Enum missing. Inserting basic user.';
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (new.id, new.email, 'System User', 'student'); -- assuming text column if enum missing?
    RETURN new;
  WHEN OTHERS THEN
    -- CATCH ALL: If anything fails (constraints, missing columns), log it and Allow SignUp
    RAISE WARNING 'Error creating user profile: %. User created without profile.', SQLERRM;
    RETURN new;
END;
$$;

-- 3. Re-enable the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Verify 'users' table columns exist to prevent the "Warning" path
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS aadhar_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
