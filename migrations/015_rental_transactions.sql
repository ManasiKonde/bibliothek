-- Audit log for rental-related payments (deposit refund, late fee, damage fee, extension)
CREATE TABLE IF NOT EXISTS public.rental_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'rental_payment' | 'deposit_refund' | 'late_fee' | 'damage_fee' | 'extension_fee'
  amount_paise bigint NOT NULL,
  razorpay_payment_id text,
  razorpay_refund_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rental_transactions_rental_id_idx ON public.rental_transactions(rental_id);

ALTER TABLE public.rental_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rental_transactions_select_via_rental" ON public.rental_transactions;
CREATE POLICY "rental_transactions_select_via_rental"
  ON public.rental_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rentals r
      WHERE r.id = rental_id AND (r.buyer_id = auth.uid() OR r.seller_id = auth.uid())
    )
  );

-- Only server/Edge Functions insert (use service role). No policy for INSERT so anon/authenticated cannot insert.
-- For app to log we'd need a policy; allow authenticated to insert if they are seller or buyer of the rental.
DROP POLICY IF EXISTS "rental_transactions_insert_own" ON public.rental_transactions;
CREATE POLICY "rental_transactions_insert_own"
  ON public.rental_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rentals r
      WHERE r.id = rental_id AND (r.buyer_id = auth.uid() OR r.seller_id = auth.uid())
    )
  );
