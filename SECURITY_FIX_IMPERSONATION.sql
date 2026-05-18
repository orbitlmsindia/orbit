-- SECURITY FIX: Server-Side Impersonation Verification
-- Run this in your Supabase SQL Editor

-- 1. Create a secure table to hold active impersonation sessions
CREATE TABLE IF NOT EXISTS impersonation_tokens (
    token UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    super_admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    college_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '2 hours'
);

-- 2. Enable RLS on the new table
ALTER TABLE impersonation_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Super admins can manage tokens
CREATE POLICY "super_admins_manage_tokens" ON impersonation_tokens
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

-- 4. Create the RPC function to GRANT impersonation securely
CREATE OR REPLACE FUNCTION grant_impersonation(p_college_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_token UUID;
BEGIN
    -- Verify the caller actually has the super_admin role in the database
    SELECT role INTO v_role FROM users WHERE id = auth.uid();
    
    IF v_role != 'super_admin' THEN
        RAISE EXCEPTION 'Unauthorized: Impersonation strictly requires super_admin privileges.';
    END IF;

    -- Generate a secure token tied to this super admin and the target college
    INSERT INTO impersonation_tokens (super_admin_id, college_id)
    VALUES (auth.uid(), p_college_id)
    RETURNING token INTO v_token;

    -- Optional: Log this action if the audit_logs table exists
    -- INSERT INTO audit_logs (action, user_id) VALUES ('IMPERSONATION_GRANTED', auth.uid());

    RETURN v_token;
END;
$$;

-- 5. Create the RPC function to VERIFY an impersonation attempt
CREATE OR REPLACE FUNCTION verify_impersonation(p_token UUID, p_college_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_valid BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM impersonation_tokens 
        WHERE token = p_token 
          AND college_id = p_college_id 
          AND super_admin_id = auth.uid()
          AND expires_at > NOW()
    ) INTO v_is_valid;
    
    RETURN v_is_valid;
END;
$$;
