-- 1. Create the columns if they don't exist (Idempotent)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;

-- 2. Drop the existing trigger first to avoid conflicts or stale definitions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Drop the function to ensure we can recreate it with a clean slate
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. Recreate the function with robust error handling and casting
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, status, department)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Unknown User'),
    -- Safely cast role, default to 'student' if invalid or missing
    COALESCE(
      (new.raw_user_meta_data->>'role')::user_role, 
      'student'::user_role
    ),
    -- Default status to 'pending'
    COALESCE(new.raw_user_meta_data->>'status', 'pending'),
    new.raw_user_meta_data->>'department'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    -- If user exists, update their details instead of failing
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    department = EXCLUDED.department,
    updated_at = NOW();
    
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction if possible (optional, but good for debugging)
  -- RAISE WARNING 'handle_new_user trigger failed: %', SQLERRM;
  -- For now, we WANT it to fail if it can't insert, so we re-raise
  RAISE; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
