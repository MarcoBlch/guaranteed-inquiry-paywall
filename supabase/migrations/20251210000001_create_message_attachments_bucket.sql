-- Create storage bucket for message attachments
-- Migration: 20251210000001_create_message_attachments_bucket.sql

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  true, -- Public bucket for easy access (files are secure via unguessable UUIDs)
  10485760, -- 10MB per file
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- Create RLS policies for the bucket
-- Allow anonymous uploads (needed for anonymous payment flow)
CREATE POLICY "Allow anonymous uploads to message-attachments"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'message-attachments');

-- Allow public downloads (needed since it's a public bucket)
CREATE POLICY "Allow public downloads from message-attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'message-attachments');

-- Allow authenticated users to upload their own files
CREATE POLICY "Allow authenticated uploads to message-attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Allow users to delete their own message attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'message-attachments');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_id
ON storage.objects(bucket_id)
WHERE bucket_id = 'message-attachments';

COMMENT ON TABLE storage.objects IS 'Storage objects including message attachments';
