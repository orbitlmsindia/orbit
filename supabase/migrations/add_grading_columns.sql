
-- Add grading columns to enrollments table
ALTER TABLE enrollments 
ADD COLUMN quiz_score FLOAT DEFAULT 0,
ADD COLUMN manual_score FLOAT DEFAULT 0,
ADD COLUMN final_score FLOAT DEFAULT 0;
