-- Migration: 0014_source_check
-- Adds 'recurring' as a valid value for appointments.source.

alter table public.appointments
  drop constraint appointments_source_check;

alter table public.appointments
  add constraint appointments_source_check
  check (source in ('website', 'external', 'recurring'));
