-- Rentals: one row per rental agreement (book rented to buyer by seller)
CREATE TABLE IF NOT EXISTS public.rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id text NOT NULL,
  book_title text,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_name text,

  -- Terms (copied from book at rental start)
  rental_days int NOT NULL,
  usage_rules text NOT NULL,
  damage_penalty numeric(10,2) NOT NULL,
  late_penalty_per_day numeric(10,2) NOT NULL,

  -- Amounts (in INR)
  rental_fee numeric(10,2) NOT NULL,
  security_deposit numeric(10,2) NOT NULL,
  extension_fee numeric(10,2),
  extension_days int,
  late_fee_charged numeric(10,2) DEFAULT 0,
  damage_fee_charged numeric(10,2) DEFAULT 0,

  -- Dates
  start_date timestamptz,
  due_date timestamptz NOT NULL,
  return_date timestamptz,
  extended_due_date timestamptz,

  -- Status: active | overdue | completed | blocked
  status text NOT NULL DEFAULT 'active',

  -- Payment tracking
  rental_payment_id text,
  deposit_payment_id text,
  deposit_refunded_at timestamptz,
  extension_payment_id text,
  penalty_payment_id text,

  -- Condition images (URLs)
  pre_rental_images text[],
  return_images text[],

  -- Extension: only one allowed
  extension_used boolean DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rentals_seller_id_idx ON public.rentals(seller_id);
CREATE INDEX IF NOT EXISTS rentals_buyer_id_idx ON public.rentals(buyer_id);
CREATE INDEX IF NOT EXISTS rentals_book_id_idx ON public.rentals(book_id);
CREATE INDEX IF NOT EXISTS rentals_status_idx ON public.rentals(status);
CREATE INDEX IF NOT EXISTS rentals_due_date_idx ON public.rentals(due_date);

ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- Buyers and sellers can read their own rentals
DROP POLICY IF EXISTS "rentals_select_own" ON public.rentals;
CREATE POLICY "rentals_select_own"
  ON public.rentals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- Only backend or seller creates rental (app will create after payment; for simplicity allow authenticated insert with buyer_id = self for checkout flow)
DROP POLICY IF EXISTS "rentals_insert" ON public.rentals;
CREATE POLICY "rentals_insert"
  ON public.rentals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Seller and buyer can update (e.g. return_date, return_images, status)
DROP POLICY IF EXISTS "rentals_update_own" ON public.rentals;
CREATE POLICY "rentals_update_own"
  ON public.rentals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = seller_id OR auth.uid() = buyer_id);
