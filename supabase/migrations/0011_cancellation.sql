-- Cancellation flow: cancel token, timestamps, fee tracking

ALTER TABLE public.appointments
  ADD COLUMN cancel_token text UNIQUE,
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN cancellation_type text CHECK (cancellation_type IN ('on_time', 'late'));

CREATE TABLE public.late_cancellation_fees (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  customer_name    text NOT NULL,
  customer_phone   text NOT NULL,
  amount_owed      numeric(8,2) NOT NULL,
  paid_at          timestamptz,
  marked_paid_by   uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.late_cancellation_fees ENABLE ROW LEVEL SECURITY;

-- Staff can read and update fees (mark as paid)
CREATE POLICY "Staff can read cancellation fees"
  ON public.late_cancellation_fees FOR SELECT
  USING (is_staff());

CREATE POLICY "Staff can update cancellation fees"
  ON public.late_cancellation_fees FOR UPDATE
  USING (is_staff());

-- Service role inserts fees (via admin client in server actions)
CREATE POLICY "Service role can insert cancellation fees"
  ON public.late_cancellation_fees FOR INSERT
  WITH CHECK (true);
