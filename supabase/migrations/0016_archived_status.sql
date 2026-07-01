-- Migration: 0016_archived_status
-- Adds 'archived' as a valid value for appointments.status.

alter table public.appointments
  drop constraint appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('confirmed', 'cancelled', 'archived'));
