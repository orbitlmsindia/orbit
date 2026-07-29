-- FIX FOR ADMIN USER MANAGEMENT (Approve, Edit, Delete)
-- Run this script in your Supabase SQL Editor

-- 1. Allow Admins to UPDATE users (Needed for Approving, Editing)
DROP POLICY IF EXISTS "admin_update_users" ON users;
CREATE POLICY "admin_update_users" ON users
  FOR UPDATE USING (public.is_admin_user());

-- 2. Allow Admins to DELETE users (Needed for Reject/Delete)
DROP POLICY IF EXISTS "admin_delete_users" ON users;
CREATE POLICY "admin_delete_users" ON users
  FOR DELETE USING (public.is_admin_user());

-- Optional: If students or teachers can update their own profile, add this:
DROP POLICY IF EXISTS "users_update_own_row" ON users;
CREATE POLICY "users_update_own_row" ON users
  FOR UPDATE USING (auth.uid() = id);
