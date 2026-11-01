-- ==============================================================================
-- ORBIT LMS - FINANCE TRANSACTIONS AND RECEIPTS SCHEMA DEFINITION
-- Fixes: F2, F3, F6 (Student Transaction Recording, Digital Receipts & Real Data Links)
-- Run this in your Supabase SQL Editor to enable full finance persistence.
-- ==============================================================================

-- 1. Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    mode VARCHAR(50) NOT NULL DEFAULT 'UPI',
    reference VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'approved',
    notes TEXT,
    college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create receipts table
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no VARCHAR(50) UNIQUE NOT NULL,
    transaction_id VARCHAR(100),
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'UPI',
    issued_by VARCHAR(255) DEFAULT 'Finance Officer',
    notes TEXT,
    college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON public.transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_course_id ON public.transactions(course_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_college_id ON public.transactions(college_id);
CREATE INDEX IF NOT EXISTS idx_transactions_paid_at ON public.transactions(paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipts_receipt_no ON public.receipts(receipt_no);
CREATE INDEX IF NOT EXISTS idx_receipts_student_id ON public.receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_college_id ON public.receipts(college_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for transactions
DROP POLICY IF EXISTS "Allow authenticated read transactions" ON public.transactions;
CREATE POLICY "Allow authenticated read transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert transactions" ON public.transactions;
CREATE POLICY "Allow authenticated insert transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update transactions" ON public.transactions;
CREATE POLICY "Allow authenticated update transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (true);

-- 6. RLS Policies for receipts
DROP POLICY IF EXISTS "Allow authenticated read receipts" ON public.receipts;
CREATE POLICY "Allow authenticated read receipts"
ON public.receipts FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert receipts" ON public.receipts;
CREATE POLICY "Allow authenticated insert receipts"
ON public.receipts FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. Ensure enrollments table has reference and payment columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'enrollments' 
        AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE public.enrollments ADD COLUMN transaction_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'enrollments' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.enrollments ADD COLUMN payment_method VARCHAR(50);
    END IF;
END $$;

