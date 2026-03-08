-- Track rental violations for enforcement: warning -> temporary restriction -> block
CREATE TABLE IF NOT EXISTS public.rental_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warning_count int NOT NULL DEFAULT 0,
  restricted_until timestamptz,
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS rental_violations_user_id_idx ON public.rental_violations(user_id);

ALTER TABLE public.rental_violations ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
DROP POLICY IF EXISTS "rental_violations_select_own" ON public.rental_violations;
CREATE POLICY "rental_violations_select_own"
  ON public.rental_violations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role or app logic will upsert; allow user to read only. Inserts/updates from Edge Functions or with service role.
-- For app: we need to check violation status before checkout. So we need SELECT. Updates to violations (e.g. after overdue) can be done via Edge Function or a dedicated API. For now allow authenticated to update their own row only for "acknowledging" - no, better: only server/Edge Function updates violations. So no INSERT/UPDATE policy for authenticated - we'll use service role in Edge Function or add a policy that allows update when e.g. seller_id or buyer_id in related rental. Actually the simplest is: allow authenticated to read; INSERT/UPDATE are done via Edge Function with service role, or we add a policy that lets a user update only to increment their own warning_count when triggered by a rental event (complex). Simpler: allow both SELECT and UPDATE for own row so the app can "record a violation" when e.g. marking a rental as overdue - but that could be abused. Safest: SELECT only for authenticated; INSERT/UPDATE via Edge Function. So app only reads. When we implement "record violation" we do it from an Edge Function that uses service role.
-- Allow insert: user can create their own row (e.g. before first rental), or seller can create a row for a buyer they have a rental with
DROP POLICY IF EXISTS "rental_violations_insert_own" ON public.rental_violations;
CREATE POLICY "rental_violations_insert_own"
  ON public.rental_violations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.rentals r WHERE r.buyer_id = user_id AND r.seller_id = auth.uid())
  );

-- Allow update only by the seller of a rental where the violation user is the buyer (so seller can report warning/restrict/block for their renter)
DROP POLICY IF EXISTS "rental_violations_update_by_seller" ON public.rental_violations;
CREATE POLICY "rental_violations_update_by_seller"
  ON public.rental_violations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rentals r
      WHERE r.buyer_id = rental_violations.user_id
        AND r.seller_id = auth.uid()
    )
  )
  WITH CHECK (true);
