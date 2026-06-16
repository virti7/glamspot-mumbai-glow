-- ============================================================
-- 002_create_storage.sql
-- Supabase Storage bucket for glam-scan images
-- ============================================================

-- Create the private bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('glam-scans', 'glam-scans', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage RLS policies
-- ============================================================

-- Authenticated users can upload to their own folder
CREATE POLICY "storage_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'glam-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can read their own files
CREATE POLICY "storage_select_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'glam-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role (server) can read any file in the bucket
CREATE POLICY "storage_select_service_role"
  ON storage.objects
  FOR SELECT
  TO service_role
  USING (bucket_id = 'glam-scans');
