-- Upgrade section_contents to support mixed content types
ALTER TABLE section_contents
ADD COLUMN video_url TEXT,
ADD COLUMN pdf_url TEXT,
ADD COLUMN summary TEXT;

-- assignments likely already has course_id, but let's ensure it has section_id
ALTER TABLE assignments
ADD COLUMN section_id UUID REFERENCES course_sections(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_assignments_section ON assignments(section_id);
