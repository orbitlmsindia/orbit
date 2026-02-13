-- STEP 1: Add Enum Values
-- Run this file ALONE first.
-- This adds the missing values to your database types.

-- 1. Add 'master_admin' to user_role
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE 'master_admin';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add 'assignment' to assignment_type
DO $$ BEGIN
    ALTER TYPE assignment_type ADD VALUE 'assignment';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
