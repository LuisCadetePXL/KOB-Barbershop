-- Migration: 0007_phase8_calendar
-- Google Calendar two-way integration
-- 1. google_calendar_id per barber (which Google Calendar to write to / sync from)
-- 2. source column on appointments ('website' | 'external')
-- 3. service_id made nullable — external/phone bookings don't have a service
-- 4. Unique index on google_calendar_event_id for efficient upsert during sync

alter table public.barbers
  add column google_calendar_id text;

alter table public.appointments
  add column source text not null default 'website'
  check (source in ('website', 'external'));

-- External appointments created from Calendar don't have a service
alter table public.appointments
  alter column service_id drop not null;

-- Unique index so the cron sync can upsert on (google_calendar_event_id)
create unique index appointments_gcal_event_id_idx
  on public.appointments (google_calendar_event_id)
  where google_calendar_event_id is not null;
