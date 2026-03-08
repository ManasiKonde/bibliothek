-- Store book title in messages so conversations can be shown without the book listing
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS book_title text;
