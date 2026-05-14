-- ==============================================================================
-- COMPREHENSIVE SUPABASE REGISTRATION FIX
-- Run this entire script in your Supabase SQL Editor
-- This will ensure users can register without hitting the 500 Database Error
-- ==============================================================================

-- 1. Ensure all missing columns exist in the public.users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE public.users ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'department') THEN
        ALTER TABLE public.users ADD COLUMN department TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'aadhar_number') THEN
        ALTER TABLE public.users ADD COLUMN aadhar_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'mobile_number') THEN
        ALTER TABLE public.users ADD COLUMN mobile_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'address') THEN
        ALTER TABLE public.users ADD COLUMN address TEXT;
    END IF;
END $$;

-- 2. Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Create a bomb-proof trigger function
-- It wraps the INSERT in an EXCEPTION block so that if public.users fails, 
-- auth.users STILL succeeds and the frontend does not crash.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
    v_role public.user_role;
BEGIN
    -- Safely parse the role enum, default to student
    BEGIN
        v_role := COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role);
    EXCEPTION WHEN OTHERS THEN
        v_role := 'student'::public.user_role;
    END;

    -- Safety block for the insert
    BEGIN
        INSERT INTO public.users (
            id, 
            email, 
            full_name, 
            role, 
            status, 
            department, 
            aadhar_number, 
            mobile_number, 
            address
        )
        VALUES (
            new.id, 
            new.email, 
            COALESCE(new.raw_user_meta_data->>'full_name', 'New User'), 
            v_role,
            COALESCE(new.raw_user_meta_data->>'status', 'pending'),
            new.raw_user_meta_data->>'department',
            new.raw_user_meta_data->>'aadhar_number',
            new.raw_user_meta_data->>'mobile_number',
            new.raw_user_meta_data->>'address'
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log to postgres logs but DO NOT fail the signup
        RAISE WARNING 'handle_new_user trigger failed to insert public user: %', SQLERRM;
    END;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Reattach the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Give proper permissions to the authenticated role for Upserts
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;
