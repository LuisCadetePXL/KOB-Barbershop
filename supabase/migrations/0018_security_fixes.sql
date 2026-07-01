-- Migration: 0018_security_fixes
--   H-A — Prevent duplicate late-cancellation fees for the same appointment
--         (the double-cancel race could insert two fee rows for one appointment).
--   M-A — Enforce avatar upload constraints at the storage-bucket level
--         (max 5 MB, images only) as a backstop to the server-side validation.

-- ── H-A: one fee row per appointment ──────────────────────────────────────────
-- Remove any pre-existing duplicates first (keep one row per appointment via ctid)
-- so the unique constraint can be added even if the race already produced dupes.
delete from public.late_cancellation_fees a
using public.late_cancellation_fees b
where a.appointment_id = b.appointment_id
  and a.ctid > b.ctid;

alter table public.late_cancellation_fees
  add constraint uq_fee_per_appt unique (appointment_id);

-- ── M-A: restrict the avatars bucket to images ≤ 5 MB ─────────────────────────
update storage.buckets
   set file_size_limit   = 5242880,  -- 5 MB
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
 where id = 'avatars';
