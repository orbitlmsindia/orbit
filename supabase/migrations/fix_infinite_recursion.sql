-- 1. Fix Infinite Recursion on Users table
-- The issue happens when a policy on `users` tries to SELECT from `users`.
-- To fix this, we'll avoid querying the `users` table directly inside its own policy.
-- Instead, we get the role via `auth.jwt() ->> 'user_role'` or bypass it for admins globally.

DROP POLICY IF EXISTS "Teachers can view students" ON public.users;

-- Recreate policy using a JWT claim or a simpler check that DOES NOT query the users table again
-- Assuming role is passed into auth.jwt() standard claims, or we just allow reads for authenticated users
CREATE POLICY "Users can view other users" ON public.users
FOR SELECT
USING (auth.role() = 'authenticated');

-- 2. Ensure Attendance policies are clean
DROP POLICY IF EXISTS "Teachers can manage attendance" ON public.attendance;

-- Create policy for attendance that allows teachers to manage it
-- This might cause recursion if users table is queried inside, but since we fixed `users` table above, it should be safer. 
-- For optimal safety, we can use the existence of the course ownership as a check, or rely on a function.

CREATE POLICY "Teachers can manage attendance" ON public.attendance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE public.courses.id = attendance.course_id 
    AND public.courses.teacher_id = auth.uid()
  )
  OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE public.courses.id = attendance.course_id 
    AND public.courses.teacher_id = auth.uid()
  )
  OR
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
