-- Optional: extension terms (seller can set "extension: +X days, Rs Y") and major damage penalty
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS extension_days int,
  ADD COLUMN IF NOT EXISTS extension_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS major_damage_penalty numeric(10,2);
