-- 1. Replace the debug function with the REAL logic to utilize actual user data
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    -- Extract full_name from metadata, default to 'New User' if missing
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    -- Extract role, safely cast to user_role enum, default to 'student'
    CASE 
      WHEN (new.raw_user_meta_data->>'role') = 'admin' THEN 'admin'::user_role
      WHEN (new.raw_user_meta_data->>'role') = 'teacher' THEN 'teacher'::user_role
      ELSE 'student'::user_role
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. REPAIR the "Debug User" entries created recently
-- This updates public.users with the actual data stored in auth.users metadata
UPDATE public.users
SET 
  full_name = COALESCE(au.raw_user_meta_data->>'full_name', 'New User'),
  role = CASE 
    WHEN (au.raw_user_meta_data->>'role') = 'admin' THEN 'admin'::user_role
    WHEN (au.raw_user_meta_data->>'role') = 'teacher' THEN 'teacher'::user_role
    ELSE 'student'::user_role
  END
FROM auth.users au
WHERE public.users.id = au.id 
  AND public.users.full_name = 'Debug User';
