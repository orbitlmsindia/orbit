-- =====================================================
-- ORBIT LMS: Course Pricing + Coupon System Migration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. ADD PRICING & ORGANIZATION COLUMNS TO COURSES TABLE
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS organization_name TEXT,
ADD COLUMN IF NOT EXISTS organization_logo_url TEXT;

-- 2. CREATE COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'flat')),
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  min_purchase NUMERIC(10,2) DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(code)
);

-- 3. CREATE COUPON USAGE TRACKING TABLE
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  discount_applied NUMERIC(10,2) NOT NULL DEFAULT 0,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coupon_id, student_id, course_id)
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_teacher ON coupons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_coupons_course ON coupons(course_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_student ON coupon_usage(student_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);

-- 5. ENABLE RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES FOR COUPONS
-- Admin: Full access to all coupons
CREATE POLICY "Admin manage all coupons" ON coupons
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Teacher: Manage own coupons
CREATE POLICY "Teacher manage own coupons" ON coupons
  FOR ALL USING (
    teacher_id = auth.uid()
  ) WITH CHECK (
    teacher_id = auth.uid()
  );

-- Students: Read active coupons (for validation)
CREATE POLICY "Students read active coupons" ON coupons
  FOR SELECT USING (
    is_active = true
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'student'
  );

-- 7. RLS POLICIES FOR COUPON USAGE
-- Admin: Full access
CREATE POLICY "Admin manage coupon usage" ON coupon_usage
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Teacher: View usage for their coupons
CREATE POLICY "Teacher view own coupon usage" ON coupon_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coupons WHERE coupons.id = coupon_usage.coupon_id AND coupons.teacher_id = auth.uid()
    )
  );

-- Student: Insert own usage & view own usage
CREATE POLICY "Student insert coupon usage" ON coupon_usage
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
  );

CREATE POLICY "Student view own coupon usage" ON coupon_usage
  FOR SELECT USING (
    student_id = auth.uid()
  );
