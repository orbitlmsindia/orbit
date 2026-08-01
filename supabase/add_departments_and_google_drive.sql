-- SQL Migration Script for Orbit LMS: Departments & Google Drive Video Embed Support

-- 1. Create Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert Default Departments if empty
INSERT INTO public.departments (name, code, description)
VALUES 
    ('Computer Science', 'CS', 'Department of Computer Science and Information Technology'),
    ('Design', 'DES', 'Department of User Experience, Interface & Visual Design'),
    ('Business', 'BUS', 'Department of Business Administration and Entrepreneurship'),
    ('Marketing', 'MKT', 'Department of Marketing and Communications'),
    ('Electrical Engineering', 'EE', 'Department of Electrical & Electronics Engineering')
ON CONFLICT (name) DO NOTHING;

-- 3. Enable RLS on Departments Table
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow public read access to departments"
    ON public.departments FOR SELECT
    USING (true);

-- Allow full access to admins
CREATE POLICY "Allow admins full access to departments"
    ON public.departments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin')
        )
    );

-- 4. Ensure Users Table supports department
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;

-- 5. Ensure Section Contents supports video_url and content_type
ALTER TABLE public.section_contents ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON TABLE public.departments IS 'Departments created by admins and assigned to teachers';
