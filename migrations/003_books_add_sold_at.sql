-- Add sold_at so sellers can mark a listing as sold
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS sold_at timestamp with time zone;
