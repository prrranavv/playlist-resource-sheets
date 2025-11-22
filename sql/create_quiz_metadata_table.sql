-- Create table to store quiz metadata (quiz gen keys and YouTube video IDs)
-- quiz_gen_key: For assessments (null for IVs)
-- youtube_video_id: For interactive videos (null for quizzes)

CREATE TABLE IF NOT EXISTS quiz_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id TEXT NOT NULL UNIQUE,
  quiz_gen_key TEXT,
  youtube_video_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_quiz_metadata_quiz_id ON quiz_metadata(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_metadata_quiz_gen_key ON quiz_metadata(quiz_gen_key) WHERE quiz_gen_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_metadata_youtube_video_id ON quiz_metadata(youtube_video_id) WHERE youtube_video_id IS NOT NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quiz_metadata_updated_at
  BEFORE UPDATE ON quiz_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE quiz_metadata IS 'Stores cached quiz gen keys for assessments and YouTube video IDs for interactive videos';

