-- Run this in Supabase SQL Editor: https://app.supabase.com

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  action_items TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default categories
INSERT INTO categories (name, is_default) VALUES
  ('IP Platform', TRUE),
  ('Business Dev', TRUE),
  ('Personal', TRUE),
  ('Open Question', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Optional: disable RLS for a fully private personal app
-- (the app uses the service role key in API routes, so this is fine)
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE ideas DISABLE ROW LEVEL SECURITY;

-- Or, if you prefer to keep RLS on and use the anon key, run this instead:
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all" ON categories FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all" ON ideas FOR ALL USING (true) WITH CHECK (true);
