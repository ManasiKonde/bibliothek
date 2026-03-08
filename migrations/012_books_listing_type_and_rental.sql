-- Listing type: 'sell' (default) or 'rent'. For rent listings, rental fields are required.
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'sell',
  ADD COLUMN IF NOT EXISTS rental_days int,
  ADD COLUMN IF NOT EXISTS usage_rules text,
  ADD COLUMN IF NOT EXISTS damage_penalty numeric(10,2),
  ADD COLUMN IF NOT EXISTS late_penalty_per_day numeric(10,2),
  ADD COLUMN IF NOT EXISTS security_deposit numeric(10,2);

-- For rent: price is the rental fee; security_deposit is refundable
-- Constraint: if listing_type = 'rent' then rental_days, usage_rules, damage_penalty, late_penalty_per_day, security_deposit must be set (enforced in app; optional DB check)
-- ALTER TABLE public.books ADD CONSTRAINT books_rental_fields_check CHECK (
--   listing_type <> 'rent' OR (rental_days IS NOT NULL AND rental_days > 0 AND usage_rules IS NOT NULL AND usage_rules <> '' AND damage_penalty IS NOT NULL AND late_penalty_per_day IS NOT NULL AND security_deposit IS NOT NULL)
-- );
