-- Fix handle_new_user trigger function to remove institute_id dependency

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student') -- Default to student
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
