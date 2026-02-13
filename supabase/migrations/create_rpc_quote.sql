
-- RPC Function to Safely Create Quotes (Bypasses RLS)
-- Run this in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION create_quote(
  p_text TEXT,
  p_priority INT,
  p_source TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Runs with admin privileges
SET search_path = public
AS $$
BEGIN
  -- 1. Explicitly check user role (Secure Check)
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('teacher', 'admin') -- Removed invalid role to prevent errors
  ) THEN
    RAISE EXCEPTION 'Access Denied: You must be a teacher or admin to post quotes.';
  END IF;

  -- 2. Perform the Insert (Bypassing Table RLS)
  INSERT INTO public.daily_quotes (text, priority, source, created_by)
  VALUES (p_text, p_priority, p_source, auth.uid());
  
END;
$$;

-- Grant execute permission to logged-in users
GRANT EXECUTE ON FUNCTION create_quote TO authenticated;
