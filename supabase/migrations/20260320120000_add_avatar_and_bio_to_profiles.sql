-- Add avatar_url and bio_quote columns to profiles
-- Migration: 20260320120000_add_avatar_and_bio_to_profiles.sql

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_quote TEXT;

-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true, -- Public so anonymous senders can see avatars on payment page
  2097152, -- 2MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- RLS: Authenticated users can upload to their own folder only
CREATE POLICY "Allow authenticated uploads to profile-avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Public read access (anonymous senders need to see avatars)
CREATE POLICY "Allow public downloads from profile-avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-avatars');

-- RLS: Authenticated users can overwrite their own avatar
CREATE POLICY "Allow authenticated updates to profile-avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Authenticated users can delete their own avatar
CREATE POLICY "Allow authenticated deletes from profile-avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
