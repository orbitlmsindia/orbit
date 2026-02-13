-- ISOLATION TEST: Disable Trigger
-- Run this to confirm if the trigger is the cause of the 500 error.

-- 1. Drop the trigger entirely.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. (Optional) Check for any other triggers on auth.users causing issues?
-- We can't easily see them here, but dropping ours is the first step.
