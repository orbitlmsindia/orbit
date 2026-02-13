-- RUN THIS IN SUPABASE SQL EDITOR TO FIX YOUR ADMIN ACCOUNT
-- Replace 'admin@example.com' with the email you tried to sign up with.

DO $$
DECLARE
  v_email TEXT := 'pragyagoyal1717@gmail.com'; -- <<< CHANGE THIS TO YOUR EMAIL
  v_user_id UUID;
BEGIN
  -- 1. Force confirm the user's email so you can login
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE email = v_email
  RETURNING id INTO v_user_id;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User % not found in auth.users. Please sign up first.', v_email;
    RETURN;
  END IF;

  -- 2. Ensure the public profile exists (in case the trigger failed earlier)
  INSERT INTO public.users (id, email, full_name, role, institute_id)
  SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name', 
    (raw_user_meta_data->>'role')::public.user_role,
    (raw_user_meta_data->>'institute_id')::uuid
  FROM auth.users
  WHERE id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'User % confirmed and profile synced.', v_email;
END;
$$;
