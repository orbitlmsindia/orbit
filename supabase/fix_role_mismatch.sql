-- 1. Redefine the trigger function with case-insensitive checking and trimming
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  extracted_role text;
  final_role user_role;
BEGIN
  -- Extract role safely from metadata (handle potential jsonb issues)
  -- We treat it as text, trim whitespace, and convert to lowercase
  extracted_role := TRIM(LOWER((new.raw_user_meta_data->>'role')::text));

  -- Determine the final role enum
  IF extracted_role = 'admin' THEN
    final_role := 'admin'::user_role;
  ELSIF extracted_role = 'teacher' THEN
    final_role := 'teacher'::user_role;
  ELSE
    final_role := 'student'::user_role;
  END IF;

  -- Insert into public.users
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    final_role
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Force update existing users who have the wrong role in public.users
-- This aligns the public table with the actual auth metadata
UPDATE public.users pu
SET role = 'teacher'::user_role
FROM auth.users au
WHERE pu.id = au.id
  AND (au.raw_user_meta_data->>'role')::text = 'teacher'
  AND pu.role != 'teacher'::user_role;

-- 3. Just for sanity, update Admins too if any mismatched
UPDATE public.users pu
SET role = 'admin'::user_role
FROM auth.users au
WHERE pu.id = au.id
  AND (au.raw_user_meta_data->>'role')::text = 'admin'
  AND pu.role != 'admin'::user_role;
