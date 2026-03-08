-- Orders: buyer, book, seller, status (for return flow)
-- book_id stored as text to match app Book.id (may be uuid or custom string)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_name text NOT NULL,
  book_id text NOT NULL,
  book_title text NOT NULL,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'return_requested', 'return_approved', 'return_rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_buyer_id_idx ON public.orders (buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_id_idx ON public.orders (seller_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Buyers can see their orders; sellers can see orders where they are the seller
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Authenticated users can insert (as buyer)
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Buyer can update their own order to request return (status -> return_requested)
-- Seller can update to return_approved or return_rejected
DROP POLICY IF EXISTS "orders_update_status" ON public.orders;
CREATE POLICY "orders_update_status"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = buyer_id AND status = 'completed')
    OR (auth.uid() = seller_id AND status = 'return_requested')
  )
  WITH CHECK (true);
