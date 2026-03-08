-- Optional seller notes: extra condition details or notes for the reader
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS notes text;
