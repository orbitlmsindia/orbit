-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE content_type AS ENUM ('video', 'pdf', 'text', 'mixed');
CREATE TYPE assignment_type AS ENUM ('manual', 'quiz');
CREATE TYPE submission_status AS ENUM ('pending', 'submitted', 'graded', 'late');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE question_type AS ENUM ('mcq', 'short', 'long', 'boolean');

-- 1. USERS
-- Linked to Supabase Auth via ID, but managed in public schema for extra fields
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. COURSES
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL, -- Course can remain if teacher leaves
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ENROLLMENTS
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(course_id, student_id)
);

-- 4. COURSE SECTIONS
CREATE TABLE course_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SECTION CONTENTS
CREATE TABLE section_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES course_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type content_type NOT NULL, -- 'mixed' is now supported
  video_url TEXT, -- YouTube/Video URL
  pdf_url TEXT, -- PDF file URL
  content_text TEXT, -- Rich text content
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. SECTION PROGRESS (TRACKING)
CREATE TABLE section_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES section_contents(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, content_id)
);

-- 7. ASSIGNMENTS
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES course_sections(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type assignment_type NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  points INTEGER DEFAULT 100,
  time_limit_minutes INTEGER, -- Only for quizzes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. ASSIGNMENT QUESTIONS (For Quizzes)
CREATE TABLE assignment_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  type question_type NOT NULL,
  options JSONB, -- Array of strings for MCQ
  correct_answer TEXT, -- Hashed or stored plain text (protected by RLS)
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0
);

-- 9. SUBMISSIONS (Manual)
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT,
  text_content TEXT,
  status submission_status DEFAULT 'submitted',
  grade FLOAT,
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- 10. QUIZ ATTEMPTS
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  score FLOAT,
  UNIQUE(assignment_id, student_id) -- One attempt only per quiz
);

-- 11. QUIZ ANSWERS (Student Responses)
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES assignment_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  points_awarded FLOAT DEFAULT 0
);

-- 12. ATTENDANCE
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, student_id, date)
);

-- 13. NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_course ON attendance(course_id);
CREATE INDEX idx_assignments_section ON assignments(section_id);

-----------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-----------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-----------------------------------------------------------------------
-- HELPER FUNCTIONS (SECURITY DEFINER)
-----------------------------------------------------------------------

-- A. Check if user is Admin (Global)
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM public.users
  WHERE id = auth.uid();
  
  IF v_role = 'admin' THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Check if user handles a specific Course (Admin OR Teacher of course)
CREATE OR REPLACE FUNCTION public.fn_can_manage_course(_course_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_course_teacher UUID;
BEGIN
  SELECT role INTO v_user_role
  FROM public.users WHERE id = auth.uid();

  SELECT teacher_id INTO v_course_teacher
  FROM public.courses WHERE id = _course_id;

  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  ELSIF v_user_role = 'teacher' AND v_course_teacher = auth.uid() THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Check if user handles a specific Section
CREATE OR REPLACE FUNCTION public.fn_can_manage_section(_section_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_course_id UUID;
BEGIN
  SELECT course_id INTO v_course_id FROM public.course_sections WHERE id = _section_id;
  RETURN public.fn_can_manage_course(v_course_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- TRIGGER for new user (Updated for Single Tenant)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-----------------------------------------------------------------------
-- POLICIES
-----------------------------------------------------------------------

-- 1. USERS
-- Admin: Manage all users
CREATE POLICY "Admin manage all users" ON users
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- View users: Authenticated
CREATE POLICY "View users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Self: Update own profile
CREATE POLICY "Update self" ON users
  FOR UPDATE USING (id = auth.uid());

-- 2. COURSES
-- Admin: Manage all courses
CREATE POLICY "Admin manage courses" ON public.courses
  FOR ALL
  USING ( (SELECT role FROM users WHERE id = auth.uid()) = 'admin' )
  WITH CHECK ( (SELECT role FROM users WHERE id = auth.uid()) = 'admin' );

-- Teacher: Manage their own courses
CREATE POLICY "Teacher manage own courses" ON public.courses
  FOR ALL
  USING ( teacher_id = auth.uid() )
  WITH CHECK ( teacher_id = auth.uid() );

-- Public/Users: View published courses or if Admin/Teacher
CREATE POLICY "View courses list" ON public.courses
  FOR SELECT
  USING ( 
    is_published = true 
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'teacher')
  );

-- 3. ENROLLMENTS
-- Admin: Manage all
CREATE POLICY "Admin manage enrollments" ON enrollments
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Teacher: View enrollments for their courses
CREATE POLICY "Teacher view enrollments" ON enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses WHERE id = enrollments.course_id AND teacher_id = auth.uid())
  );

-- Student: View own enrollments
CREATE POLICY "Student view own enrollments" ON enrollments
  FOR SELECT USING (student_id = auth.uid());
  
-- Student: Enroll Self
CREATE POLICY "Student enroll self" ON public.enrollments
  FOR INSERT WITH CHECK (student_id = auth.uid());


-- 4. COURSE CONTENT (Sections/Contents)
-- Admin/Teacher: Unified Management Policy using SECURITY DEFINER
CREATE POLICY "Manage sections (Admin/Teacher)" ON public.course_sections
  FOR ALL
  USING ( public.fn_can_manage_course(course_id) )
  WITH CHECK ( public.fn_can_manage_course(course_id) );

-- Student: View if enrolled
CREATE POLICY "Student view sections" ON course_sections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM enrollments WHERE course_id = course_sections.course_id AND student_id = auth.uid())
  );

-- Contents
CREATE POLICY "Manage contents (Admin/Teacher)" ON public.section_contents
  FOR ALL
  USING ( public.fn_can_manage_section(section_id) )
  WITH CHECK ( public.fn_can_manage_section(section_id) );

CREATE POLICY "Student view contents" ON public.section_contents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_sections 
      JOIN enrollments ON enrollments.course_id = course_sections.course_id 
      WHERE course_sections.id = section_contents.section_id 
      AND enrollments.student_id = auth.uid()
    )
  );

-- 5. NOTIFICATIONS
CREATE POLICY "Admin manage notifications" ON notifications
  FOR ALL
  USING ( (SELECT role FROM users WHERE id = auth.uid()) = 'admin' );
 
 - -   A d d   g r a d i n g   c o l u m n s   t o   e n r o l l m e n t s   t a b l e  
 A L T E R   T A B L E   e n r o l l m e n t s    
 A D D   C O L U M N   q u i z _ s c o r e   F L O A T   D E F A U L T   0 ,  
 A D D   C O L U M N   m a n u a l _ s c o r e   F L O A T   D E F A U L T   0 ,  
 A D D   C O L U M N   f i n a l _ s c o r e   F L O A T   D E F A U L T   0 ;  
  
 - -   C r e a t e   a   f u n c t i o n   t o   g r a d e   a   q u i z   a t t e m p t  
 C R E A T E   O R   R E P L A C E   F U N C T I O N   g r a d e _ q u i z _ a t t e m p t ( a t t e m p t _ u u i d   U U I D )  
 R E T U R N S   F L O A T   A S   $ $  
 D E C L A R E  
     v _ s c o r e   F L O A T   : =   0 ;  
     v _ t o t a l _ p o i n t s   F L O A T   : =   0 ;  
     v _ a s s i g n m e n t _ i d   U U I D ;  
     v _ s t u d e n t _ i d   U U I D ;  
     r e c   R E C O R D ;  
 B E G I N  
     - -   G e t   a t t e m p t   d e t a i l s  
     S E L E C T   a s s i g n m e n t _ i d ,   s t u d e n t _ i d   I N T O   v _ a s s i g n m e n t _ i d ,   v _ s t u d e n t _ i d  
     F R O M   q u i z _ a t t e m p t s   W H E R E   i d   =   a t t e m p t _ u u i d ;  
  
     - -   L o o p   t h r o u g h   a n s w e r s   a n d   c h e c k   c o r r e c t n e s s  
     F O R   r e c   I N  
         S E L E C T    
             q a . i d   a s   a n s w e r _ i d ,  
             q a . a n s w e r _ t e x t ,  
             a q . c o r r e c t _ a n s w e r ,  
             a q . p o i n t s  
         F R O M   q u i z _ a n s w e r s   q a  
         J O I N   a s s i g n m e n t _ q u e s t i o n s   a q   O N   q a . q u e s t i o n _ i d   =   a q . i d  
         W H E R E   q a . a t t e m p t _ i d   =   a t t e m p t _ u u i d  
     L O O P  
         - -   S i m p l e   t e x t   m a t c h   ( c a s e - i n s e n s i t i v e   t r i m )  
         I F   T R I M ( L O W E R ( r e c . a n s w e r _ t e x t ) )   =   T R I M ( L O W E R ( r e c . c o r r e c t _ a n s w e r ) )   T H E N  
             v _ s c o r e   : =   v _ s c o r e   +   r e c . p o i n t s ;  
             - -   U p d a t e   i n d i v i d u a l   a n s w e r   c o r r e c t n e s s  
             U P D A T E   q u i z _ a n s w e r s   S E T   i s _ c o r r e c t   =   T R U E ,   p o i n t s _ a w a r d e d   =   r e c . p o i n t s   W H E R E   i d   =   r e c . a n s w e r _ i d ;  
         E L S E  
             U P D A T E   q u i z _ a n s w e r s   S E T   i s _ c o r r e c t   =   F A L S E ,   p o i n t s _ a w a r d e d   =   0   W H E R E   i d   =   r e c . a n s w e r _ i d ;  
         E N D   I F ;  
     E N D   L O O P ;  
  
     - -   U p d a t e   A t t e m p t   S c o r e  
     U P D A T E   q u i z _ a t t e m p t s   S E T   s c o r e   =   v _ s c o r e   W H E R E   i d   =   a t t e m p t _ u u i d ;  
  
     - -   C a l c u l a t e   T o t a l   P o s s i b l e   P o i n t s   f o r   p e r c e n t a g e  
     S E L E C T   S U M ( p o i n t s )   I N T O   v _ t o t a l _ p o i n t s   F R O M   a s s i g n m e n t _ q u e s t i o n s   W H E R E   a s s i g n m e n t _ i d   =   v _ a s s i g n m e n t _ i d ;  
  
     - -   I f   t o t a l   p o i n t s   >   0 ,   r e t u r n   p e r c e n t a g e ,   e l s e   r e t u r n   r a w   s c o r e  
     I F   v _ t o t a l _ p o i n t s   >   0   T H E N  
             R E T U R N   ( v _ s c o r e   /   v _ t o t a l _ p o i n t s )   *   1 0 0 ;  
     E L S E  
             R E T U R N   v _ s c o r e ;  
     E N D   I F ;  
  
 E N D ;  
 $ $   L A N G U A G E   p l p g s q l   S E C U R I T Y   D E F I N E R ;  
 