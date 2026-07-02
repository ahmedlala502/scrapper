/*
# Create coverage_links table (single-tenant, no auth)

1. New Tables
- `coverage_links`
- `id` (uuid, primary key)
- `platform` (text, not null) - instagram, snapchat, or tiktok
- `username` (text, not null) - social media username/handle
- `mention_or_caption` (text, not null) - mention or caption text
- `content_type` (text, not null) - post, story, video, snap, or reel
- `coverage_url` (text, not null) - the URL of the coverage
- `campaign_name` (text, optional) - associated campaign name
- `notes` (text, optional) - additional notes
- `status` (text, default 'active') - active, archived, pending
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `coverage_links`.
- Allow anon + authenticated CRUD (single-tenant, no auth required).

3. Indexes
- Index on platform for faster filtering
- Index on status for active/pending filtering
- Index on created_at for chronological ordering
*/

CREATE TABLE IF NOT EXISTS coverage_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('instagram', 'snapchat', 'tiktok')),
  username text NOT NULL,
  mention_or_caption text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('post', 'story', 'video', 'snap', 'reel')),
  coverage_url text NOT NULL,
  campaign_name text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE coverage_links ENABLE ROW LEVEL SECURITY;

-- Create policies for anon + authenticated access (single-tenant)
DROP POLICY IF EXISTS "anon_select_coverage_links" ON coverage_links;
CREATE POLICY "anon_select_coverage_links" ON coverage_links FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_coverage_links" ON coverage_links;
CREATE POLICY "anon_insert_coverage_links" ON coverage_links FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_coverage_links" ON coverage_links;
CREATE POLICY "anon_update_coverage_links" ON coverage_links FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_coverage_links" ON coverage_links;
CREATE POLICY "anon_delete_coverage_links" ON coverage_links FOR DELETE
  TO anon, authenticated USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_coverage_links_platform ON coverage_links(platform);
CREATE INDEX IF NOT EXISTS idx_coverage_links_status ON coverage_links(status);
CREATE INDEX IF NOT EXISTS idx_coverage_links_created_at ON coverage_links(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_coverage_links_updated_at ON coverage_links;
CREATE TRIGGER update_coverage_links_updated_at
  BEFORE UPDATE ON coverage_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
