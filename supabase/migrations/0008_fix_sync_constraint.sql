-- Migration: 0008_fix_sync_constraint
-- The partial unique index from 0007 (WHERE google_calendar_event_id IS NOT NULL)
-- is not recognised by PostgREST for ON CONFLICT upserts. Replace it with a full
-- UNIQUE constraint. PostgreSQL allows multiple NULLs in a unique constraint
-- (NULL != NULL), so rows without a Calendar event ID are unaffected.

drop index if exists public.appointments_gcal_event_id_idx;

alter table public.appointments
  add constraint appointments_gcal_event_id_unique
  unique (google_calendar_event_id);
