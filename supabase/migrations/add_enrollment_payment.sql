-- Add payment and status columns to enrollments table
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'qr_code',
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved'; -- default 'approved' to preserve existing data access

-- Add an admin policy to approve enrollments (update status)
-- Admins can update all enrollments, so they already have an UPADTE/ALL policy:
-- CREATE POLICY "Admin manage enrollments" ON enrollments FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Update the student view policy to NOT restrict by status, since they need to see they are pending
-- The UI will handle the "pending" versus "approved" logic.
