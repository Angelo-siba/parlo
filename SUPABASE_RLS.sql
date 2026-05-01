-- ============================================================
-- Parlo — Supabase RLS Policies for User-Based Access
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable Row Level Security on both tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROJECTS table policies
-- ============================================================

-- Drop existing policies if any (safe to re-run)
DROP POLICY IF EXISTS "Freelancers manage own projects" ON projects;
DROP POLICY IF EXISTS "Clients read projects via share token" ON projects;

-- Authenticated freelancers can read, insert, update, delete their own projects
CREATE POLICY "Freelancers manage own projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anonymous clients can read any project (they must know the share_token;
-- the app filters by share_token so only valid tokens return data)
CREATE POLICY "Clients read projects via share token"
  ON projects
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================
-- FILES table policies
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Freelancers manage own files" ON files;
DROP POLICY IF EXISTS "Clients read files" ON files;
DROP POLICY IF EXISTS "Clients update files for feedback" ON files;

-- Authenticated freelancers can manage files for their own projects
CREATE POLICY "Freelancers manage own files"
  ON files
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Anonymous clients can read files
CREATE POLICY "Clients read files"
  ON files
  FOR SELECT
  TO anon
  USING (true);

-- Anonymous clients can update files (to approve and leave feedback)
CREATE POLICY "Clients update files for feedback"
  ON files
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Make sure user_id column exists on projects
-- (skip if it was already added)
-- ============================================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
