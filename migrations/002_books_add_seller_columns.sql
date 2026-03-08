-- Add seller_name and seller_location if your books table was created without them
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS seller_name text,
  ADD COLUMN IF NOT EXISTS seller_location text;
