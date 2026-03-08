-- ============================================================
-- Bibliothek – Backend setup (run in Supabase SQL Editor)
-- ============================================================
-- Run this AFTER you have created the books table and book-images bucket.
-- If you haven't, run "Step 0" in README_BACKEND.md first.
-- ============================================================

-- ------------------------------------------------------------
-- STEP 1: Row Level Security (RLS) on books
-- ------------------------------------------------------------

-- Turn on RLS so policies control who can do what
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Drop existing policies so this script can be re-run safely
DROP POLICY IF EXISTS "books_select_all" ON public.books;
DROP POLICY IF EXISTS "books_insert_own" ON public.books;
DROP POLICY IF EXISTS "books_update_own" ON public.books;
DROP POLICY IF EXISTS "books_delete_own" ON public.books;

-- Policy: Anyone (including anon) can read all books (browse listings)
CREATE POLICY "books_select_all"
  ON public.books
  FOR SELECT
  USING (true);

-- Policy: Only logged-in users can insert; must set seller_id to their own id
CREATE POLICY "books_insert_own"
  ON public.books
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Policy: Sellers can only update their own listings
CREATE POLICY "books_update_own"
  ON public.books
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Policy: Sellers can only delete their own listings
CREATE POLICY "books_delete_own"
  ON public.books
  FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

-- Optional: index for faster "my listings" and "order by created_at"
CREATE INDEX IF NOT EXISTS books_seller_id_idx ON public.books (seller_id);
CREATE INDEX IF NOT EXISTS books_created_at_idx ON public.books (created_at DESC);

-- ------------------------------------------------------------
-- STEP 2: Storage policies for book-images bucket
-- ------------------------------------------------------------
-- Your app uploads to path: {user.id}/{uuid}.{ext}
-- So we allow: upload only into folder = auth.uid(), read for everyone.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "book_images_select_public" ON storage.objects;
DROP POLICY IF EXISTS "book_images_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "book_images_delete_own_folder" ON storage.objects;

-- Allow anyone to view images (so listing images load for all users)
CREATE POLICY "book_images_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'book-images');

-- Allow authenticated users to upload only under their own folder (user id)
CREATE POLICY "book_images_insert_own_folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'book-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete only their own folder's files
CREATE POLICY "book_images_delete_own_folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'book-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
