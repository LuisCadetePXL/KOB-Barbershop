-- Migration: 0012_breaks
-- Adds barber_breaks table and updates get_available_slots to exclude break slots.

-- ── Table ────────────────────────────────────────────────────────────────────

create table public.barber_breaks (
  id           uuid primary key default gen_random_uuid(),
  barber_id    uuid references public.barbers(id) on delete cascade,
  -- recurring=true  → day_of_week used, date ignored
  -- recurring=false → date used, day_of_week ignored
  recurring    boolean not null default false,
  day_of_week  integer check (day_of_week between 0 and 6),   -- 0=Sunday
  date         date,
  start_time   time not null,
  end_time     time not null,
  label        text not null default '',
  created_at   timestamptz not null default now(),

  constraint breaks_recurring_check check (
    (recurring = true  and day_of_week is not null) or
    (recurring = false and date is not null)
  ),
  constraint breaks_times_check check (end_time > start_time)
);

-- RLS: staff can manage, anon has no access
alter table public.barber_breaks enable row level security;

create policy "staff_all_breaks" on public.barber_breaks
  for all
  using (public.is_staff())
  with check (public.is_staff());

-- ── Updated get_available_slots ───────────────────────────────────────────────
-- Extends the existing function to also skip slots that overlap with a
-- barber_break row (matching barber_id or barber_id IS NULL = all barbers).

create or replace function public.get_available_slots(
  p_barber_id      uuid,
  p_date           date,
  p_duration_mins  integer
)
returns setof text
language plpgsql
security definer
stable
as $$
declare
  v_dow        integer;
  v_opens_at   time;
  v_closes_at  time;
  v_closed     boolean;
  v_open_min   integer;
  v_close_min  integer;
  v_cur        integer;
  v_slot_start timestamptz;
  v_slot_end   timestamptz;
  v_slot_time_start time;
  v_slot_time_end   time;
begin
  -- Whole-day closure check (unchanged)
  if exists (
    select 1 from public.closed_dates
     where date = p_date
       and (barber_id is null or barber_id = p_barber_id)
  ) then
    return;
  end if;

  v_dow := extract(dow from p_date)::integer;

  select oh.opens_at, oh.closes_at, oh.closed
    into v_opens_at, v_closes_at, v_closed
    from public.opening_hours oh
   where oh.day_of_week = v_dow;

  if not found or v_closed or v_opens_at is null or v_closes_at is null then
    return;
  end if;

  v_open_min  := extract(hour  from v_opens_at)::integer  * 60
               + extract(minute from v_opens_at)::integer;
  v_close_min := extract(hour  from v_closes_at)::integer * 60
               + extract(minute from v_closes_at)::integer;

  v_cur := v_open_min;
  while v_cur + p_duration_mins <= v_close_min loop
    v_slot_start := (p_date::text
      || ' '
      || lpad((v_cur / 60)::text, 2, '0') || ':'
      || lpad((v_cur % 60)::text, 2, '0') || ':00')::timestamp
      AT TIME ZONE 'Europe/Brussels';
    v_slot_end := v_slot_start + make_interval(mins => p_duration_mins);

    -- Local times for break overlap check (breaks stored as wall-clock times)
    v_slot_time_start := (lpad((v_cur / 60)::text, 2, '0') || ':'
                       || lpad((v_cur % 60)::text, 2, '0'))::time;
    v_slot_time_end   := v_slot_time_start + make_interval(mins => p_duration_mins);

    if not exists (
      select 1 from public.appointments a
       where a.barber_id = p_barber_id
         and a.status    = 'confirmed'
         and tstzrange(a.start_time, a.end_time, '[)') &&
             tstzrange(v_slot_start,  v_slot_end,  '[)')
    )
    and not exists (
      select 1 from public.barber_breaks b
       where (b.barber_id = p_barber_id or b.barber_id is null)
         and (
           (b.recurring = true  and b.day_of_week = v_dow) or
           (b.recurring = false and b.date = p_date)
         )
         -- slot overlaps break: slot starts before break ends AND slot ends after break starts
         and v_slot_time_start < b.end_time
         and v_slot_time_end   > b.start_time
    ) then
      return next lpad((v_cur / 60)::text, 2, '0')
               || ':' || lpad((v_cur % 60)::text, 2, '0');
    end if;

    v_cur := v_cur + 15;
  end loop;
end;
$$;

grant execute on function public.get_available_slots(uuid, date, integer)
  to anon, authenticated;
