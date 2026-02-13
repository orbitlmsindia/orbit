-- 1. Ensure the users table does not have the institute_id column
ALTER TABLE public.users DROP COLUMN IF EXISTS institute_id CASCADE;

-- 2. Drop the existing trigger to insure we can replace the function cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Replace the function with the correct single-tenant logic
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-enable the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Ensure RLS policies don't reference institute_id
DROP POLICY IF EXISTS "Admin manage all users" ON users;
CREATE POLICY "Admin manage all users" ON users
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
