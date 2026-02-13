-- Create a storage bucket for course content if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('course_content', 'course_content', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course_content');

-- Policy: Allow public to view files
CREATE POLICY "Allow public viewing"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'course_content');

-- Policy: Allow users to update/delete their own files (optional, good for management)
CREATE POLICY "Allow auth update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'course_content');

CREATE POLICY "Allow auth delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course_content');
