-- Add return reason and order lifecycle statuses (confirmed, shipped, delivered)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS return_reason text;

-- Allow new statuses: confirmed (order placed), shipped, delivered; keep existing for return flow
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'completed',
    'confirmed',
    'shipped',
    'delivered',
    'return_requested',
    'return_approved',
    'return_rejected'
  ));

-- Buyer: request return when order is completed/confirmed/shipped/delivered.
-- Seller: respond to return request (approve/reject) or mark order shipped/delivered.
DROP POLICY IF EXISTS "orders_update_status" ON public.orders;
CREATE POLICY "orders_update_status"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = buyer_id AND status IN ('completed', 'confirmed', 'shipped', 'delivered'))
    OR (auth.uid() = seller_id AND status = 'return_requested')
    OR (auth.uid() = seller_id AND status = 'confirmed')
    OR (auth.uid() = seller_id AND status = 'shipped')
  )
  WITH CHECK (true);
