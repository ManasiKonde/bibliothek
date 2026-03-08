ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_phone text;

ALTER TABLE public.rentals
  ADD COLUMN IF NOT EXISTS delivery_phone text;
