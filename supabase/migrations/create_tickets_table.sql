
-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Users can view their own tickets
CREATE POLICY "Users can view own tickets"
ON tickets FOR SELECT
USING (auth.uid() = user_id);

-- 2. Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
ON tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 3. Users can create tickets
CREATE POLICY "Users can create tickets"
ON tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Admins can update tickets (e.g. resolve them)
CREATE POLICY "Admins can update tickets"
ON tickets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
