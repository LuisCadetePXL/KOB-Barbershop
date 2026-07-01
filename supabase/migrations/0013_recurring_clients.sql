-- Migration: 0013_recurring_clients
-- Adds recurring_clients table and recurring_client_id column on appointments.

-- ── Recurring clients ─────────────────────────────────────────────────────────

create table public.recurring_clients (
  id              uuid primary key default gen_random_uuid(),
  barber_id       uuid not null references public.barbers(id) on delete cascade,
  customer_name   text not null,
  customer_phone  text not null default '',
  service_id      uuid references public.services(id) on delete set null,
  start_time      time not null,
  -- pattern_type: 'weekly' | 'biweekly' | 'triweekly' | 'monthly'
  pattern_type    text not null check (pattern_type in ('weekly', 'biweekly', 'triweekly', 'monthly')),
  day_of_week     integer not null check (day_of_week between 0 and 6),
  -- week_of_month: 1=first, 2=second, 3=third, 4=fourth, -1=last (required for monthly only)
  week_of_month   integer check (week_of_month in (1, 2, 3, 4, -1)),
  active          boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),

  constraint monthly_requires_week_of_month check (
    pattern_type != 'monthly' or week_of_month is not null
  )
);

alter table public.recurring_clients enable row level security;

create policy "staff_all_recurring_clients" on public.recurring_clients
  for all
  using (public.is_staff())
  with check (public.is_staff());

-- ── Link appointments to recurring clients ────────────────────────────────────

alter table public.appointments
  add column if not exists recurring_client_id uuid
    references public.recurring_clients(id) on delete set null;

create index if not exists idx_appointments_recurring_client
  on public.appointments(recurring_client_id)
  where recurring_client_id is not null;
