-- ============================================================
-- Parlo — Activity Log Table
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL
                          CHECK (event_type IN (
                            'file_uploaded',
                            'file_deleted',
                            'file_approved',
                            'feedback_submitted'
                          )),
  description TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_log_project_id_idx
  ON activity_log (project_id, created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe to re-run)
DROP POLICY IF EXISTS "Freelancers read own activity" ON activity_log;
DROP POLICY IF EXISTS "Freelancers insert own activity" ON activity_log;
DROP POLICY IF EXISTS "Anon insert activity" ON activity_log;

-- Authenticated freelancers can read activity for their own projects
CREATE POLICY "Freelancers read own activity"
  ON activity_log
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Authenticated freelancers can insert activity for their own projects
CREATE POLICY "Freelancers insert own activity"
  ON activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Anonymous clients can insert activity (for approvals and feedback)
CREATE POLICY "Anon insert activity"
  ON activity_log
  FOR INSERT
  TO anon
  WITH CHECK (true);
