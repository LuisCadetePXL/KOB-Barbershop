-- Migration: 0017_fix_policies
-- Security hardening:
--   K2 — Remove the overly-permissive INSERT policy on late_cancellation_fees.
--        The service role (used by the cancel flow) bypasses RLS, so this policy
--        only served to grant the public `anon` role write access, allowing anyone
--        with the public anon key to insert fake debt rows against any phone number.
--   H3 — Prevent role self-escalation via the profiles UPDATE policy by adding a
--        WITH CHECK that pins the role to its current value.

-- ── K2: drop permissive fee-insert policy ─────────────────────────────────────
drop policy if exists "Service role can insert cancellation fees"
  on public.late_cancellation_fees;

-- ── H3: lock down profiles UPDATE so role cannot be changed by the user ────────
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );
