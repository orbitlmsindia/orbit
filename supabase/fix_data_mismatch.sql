-- FIX DATA MISMATCH (Teachers not showing)
-- This script ensures that your Admin user and your Teacher users are in the SAME Institute.
-- If they are in different institutes, the dropdown will naturally be empty.

DO $$
DECLARE
  v_admin_id UUID := auth.uid(); -- Get your ID
  v_default_institute_id UUID;
BEGIN
  -- 1. Get a valid Institute ID (Create one if none exists)
  SELECT id INTO v_default_institute_id FROM public.institutes LIMIT 1;
  
  IF v_default_institute_id IS NULL THEN
     INSERT INTO public.institutes (name, domain) VALUES ('Tech Institute', 'tech.edu')
     RETURNING id INTO v_default_institute_id;
  END IF;

  -- 2. Update YOUR Admin Account to belong to this institute
  UPDATE public.users
  SET institute_id = v_default_institute_id
  WHERE id = auth.uid();
  
  -- 3. Update ALL Teachers to belong to this SAME institute (For Dev/Testing)
  UPDATE public.users
  SET institute_id = v_default_institute_id
  WHERE role = 'teacher';

  RAISE NOTICE 'Aligned Admin and Teachers to Institute ID: %', v_default_institute_id;
END;
$$;
