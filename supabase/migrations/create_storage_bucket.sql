-- Create 'assignments' storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assignments', 'assignments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy 1: Allow authenticated users (students) to upload files
-- We check for existing policy first to avoid errors, 
-- but simpler to just DROP and RECREATE for clarity.
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'assignments');

-- Policy 2: Allow public read access (so teachers can download)
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'assignments');

-- Policy 3: Allow users to update/delete their own files (optional but good)
DROP POLICY IF EXISTS "Allow individual update" ON storage.objects;
CREATE POLICY "Allow individual update" ON storage.objects
FOR UPDATE TO authenticated
USING (auth.uid() = owner);
