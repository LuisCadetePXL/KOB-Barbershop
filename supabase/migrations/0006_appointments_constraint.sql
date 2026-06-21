-- Migration: 0006_appointments_constraint
-- 1. Prevent double-booking via exclusion constraint
-- 2. Security-definer RPC so anonymous users can check slot availability
--    without being able to read appointment customer data

-- btree_gist is required for EXCLUDE with mixed types (uuid + tstzrange)
create extension if not exists btree_gist;

-- No two confirmed appointments for the same barber may have overlapping times.
-- [) means inclusive-start exclusive-end, so back-to-back slots (09:00-09:30, 09:30-10:00)
-- are NOT considered overlapping.
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status = 'confirmed');

-- Returns available 15-minute slot start times (HH:MM) for a given barber + date.
-- Runs as security definer so it can read appointments without a public SELECT policy.
-- Only returns time strings — no customer data is exposed.
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
begin
  -- Bail out if the entire shop or this specific barber has a closed_date entry
  if exists (
    select 1 from public.closed_dates
     where date = p_date
       and (barber_id is null or barber_id = p_barber_id)
  ) then
    return;
  end if;

  v_dow := extract(dow from p_date)::integer;  -- 0=Sun … 6=Sat

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
    -- Times stored and compared as UTC (barbershop is single-timezone; Phase 10 will add proper tz)
    v_slot_start := (p_date::text
      || 'T'
      || lpad((v_cur / 60)::text, 2, '0') || ':'
      || lpad((v_cur % 60)::text, 2, '0') || ':00Z')::timestamptz;
    v_slot_end := v_slot_start + make_interval(mins => p_duration_mins);

    if not exists (
      select 1 from public.appointments a
       where a.barber_id = p_barber_id
         and a.status    = 'confirmed'
         and tstzrange(a.start_time, a.end_time, '[)') &&
             tstzrange(v_slot_start,  v_slot_end,  '[)')
    ) then
      return next lpad((v_cur / 60)::text, 2, '0')
               || ':' || lpad((v_cur % 60)::text, 2, '0');
    end if;

    v_cur := v_cur + 15;
  end loop;
end;
$$;

-- Grant to both roles so anonymous booking works
grant execute on function public.get_available_slots(uuid, date, integer)
  to anon, authenticated;
