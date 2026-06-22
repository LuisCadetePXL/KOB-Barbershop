-- Migration: 0010_barber_whatsapp
-- Fase 9: Twilio WhatsApp notificaties
--
-- 1. whatsapp_number on barbers — set per barber via /admin/integrations.
--    Stored in international format without spaces, e.g. +32476000000.
--    Null = no notifications for this barber.
--
-- 2. reminder_sent on appointments — prevents duplicate customer reminders
--    when /api/cron/send-reminders runs multiple times on the same day.

alter table public.barbers
  add column whatsapp_number text;

alter table public.appointments
  add column reminder_sent boolean not null default false;
