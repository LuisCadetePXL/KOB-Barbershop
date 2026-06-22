-- Migration: 0009_fix_slot_timezone
-- Replace the wall-clock UTC slot generator with one that uses the real
-- Europe/Brussels timezone so external Calendar events (stored as real UTC)
-- are correctly detected as overlapping.
--
-- Old: p_date + HH:MM + 'Z'  → e.g. 2026-06-24T15:00:00Z for a 15:00 Brussels slot
--      ✗ conflicts with external events stored as T13:00:00Z (real UTC for 15:00 Brussels)
--
-- New: (p_date || ' HH:MM')::timestamp AT TIME ZONE 'Europe/Brussels'
--      → e.g. 2026-06-24T13:00:00Z for a 15:00 Brussels slot
--      ✓ matches both website bookings (book/actions.ts now converts correctly)
--        and external Calendar events (cron stores real UTC from Google Calendar)

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
    -- Interpret the slot time as Europe/Brussels local time and convert to real UTC.
    -- AT TIME ZONE on a timestamp WITHOUT time zone returns a timestamptz (real UTC).
    v_slot_start := (p_date::text
      || ' '
      || lpad((v_cur / 60)::text, 2, '0') || ':'
      || lpad((v_cur % 60)::text, 2, '0') || ':00')::timestamp
      AT TIME ZONE 'Europe/Brussels';
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

grant execute on function public.get_available_slots(uuid, date, integer)
  to anon, authenticated;
