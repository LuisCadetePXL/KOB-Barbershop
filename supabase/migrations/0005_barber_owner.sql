-- Migration: 0005_barber_owner
-- Adds is_owner flag to barbers for sort-priority on /team and admin

alter table public.barbers
  add column is_owner boolean not null default false;
