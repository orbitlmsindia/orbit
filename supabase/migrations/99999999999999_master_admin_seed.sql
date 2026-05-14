-- Seed Master Admin user in Supabase Auth and Public schemas
DO $$
DECLARE
  master_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
  -- Insert into auth.users (requires pgcrypto extension for crypt)
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    master_id,
    'authenticated',
    'authenticated',
    'orbitadmin@orbit.com',
    crypt('orbit@123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Master Admin"}',
    FALSE
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert into auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) 
  SELECT 
    gen_random_uuid(),
    master_id,
    master_id::text,
    format('{"sub":"%s","email":"%s"}', master_id::text, 'orbitadmin@orbit.com')::jsonb,
    'email',
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = master_id AND provider = 'email'
  );

  -- Update public.users record
  UPDATE public.users
  SET role = 'super_admin'::user_role, college_id = NULL
  WHERE id = master_id;
  
  -- If trigger failed to fire or was delayed, insert manually
  INSERT INTO public.users (id, role, email, full_name, college_id)
  VALUES (
    master_id,
    'super_admin',
    'orbitadmin@orbit.com',
    'Master Admin',
    NULL
  ) ON CONFLICT (id) DO UPDATE SET role = 'super_admin', college_id = NULL;
  
END $$;
