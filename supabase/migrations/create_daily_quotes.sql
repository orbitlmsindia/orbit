-- Create daily_quotes table
CREATE TABLE IF NOT EXISTS daily_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    priority INT DEFAULT 1, -- 1=Teacher, 2=Admin/MasterAdmin
    source TEXT CHECK (source IN ('teacher', 'admin', 'master_admin')) DEFAULT 'teacher',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies
ALTER TABLE daily_quotes ENABLE ROW LEVEL SECURITY;

-- Everyone can read quotes
CREATE POLICY "Enable read access for all users" ON daily_quotes FOR SELECT USING (true);

-- Teachers and admins can insert/update
CREATE POLICY "Enable insert for teachers and admins" ON daily_quotes FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'master_admin'))
);

-- Only creators or admins can update/delete
CREATE POLICY "Enable update/delete for creators and admins" ON daily_quotes FOR ALL USING (
    auth.uid() = created_by 
    OR 
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role IN ('admin', 'master_admin'))
);
