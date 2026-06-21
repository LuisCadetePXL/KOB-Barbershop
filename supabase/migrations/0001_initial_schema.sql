-- Migration: 0001_initial_schema
-- King of Barber — initial database schema

-- ============================================================
-- profiles (extends auth.users, role management)
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'developer')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anonieme bezoekers zien niets. Elke ingelogde user ziet alleen zijn eigen profiel.
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Alleen de user zelf mag zijn profiel updaten (rol-wijzigingen lopen via de developer, niet via de app)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================================
-- Helper: controleer of de ingelogde user admin of developer is
-- Staat ná profiles zodat PostgreSQL de tabelreferentie kan valideren
-- ============================================================
create or replace function public.is_staff()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'developer')
  );
$$;

-- ============================================================
-- barbers
-- ============================================================
create table public.barbers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  photo_url  text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.barbers enable row level security;

-- Publieke site: alleen actieve barbers leesbaar
create policy "Public can read active barbers"
  on public.barbers for select
  using (active = true);

-- Admin/developer: alle barbers leesbaar (ook inactieve), plus schrijven
create policy "Staff can read all barbers"
  on public.barbers for select
  using (public.is_staff());

create policy "Staff can manage barbers"
  on public.barbers for all
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================
-- services (prijzen)
-- ============================================================
create table public.services (
  id                   uuid primary key default gen_random_uuid(),
  name_en              text not null,
  name_nl              text,
  name_es              text,
  description_en       text,
  description_nl       text,
  description_es       text,
  price                numeric(8, 2) not null,
  duration_minutes     integer not null,
  translation_status   text not null default 'pending'
                         check (translation_status in ('pending', 'complete', 'failed')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.services enable row level security;

-- Publieke site: alle services leesbaar
create policy "Public can read services"
  on public.services for select
  using (true);

-- Admin/developer: schrijven
create policy "Staff can manage services"
  on public.services for all
  using (public.is_staff())
  with check (public.is_staff());

-- auto-update updated_at on row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- ============================================================
-- appointments
-- ============================================================
create table public.appointments (
  id                       uuid primary key default gen_random_uuid(),
  barber_id                uuid not null references public.barbers(id) on delete restrict,
  service_id               uuid not null references public.services(id) on delete restrict,
  customer_name            text not null,
  customer_phone           text not null,
  start_time               timestamptz not null,
  end_time                 timestamptz not null,
  status                   text not null default 'confirmed'
                             check (status in ('confirmed', 'cancelled')),
  google_calendar_event_id text,
  created_at               timestamptz not null default now(),
  constraint appointments_end_after_start check (end_time > start_time)
);

alter table public.appointments enable row level security;

-- Anonieme bezoekers mogen een afspraak aanmaken (booking flow), maar NIET lezen
create policy "Public can create appointments"
  on public.appointments for insert
  with check (true);

-- Admin/developer: alles lezen, updaten (annuleren), verwijderen
-- Gewone bezoekers zien geen klantgegevens van anderen
create policy "Staff can read appointments"
  on public.appointments for select
  using (public.is_staff());

create policy "Staff can manage appointments"
  on public.appointments for all
  using (public.is_staff());

create index appointments_barber_start_idx on public.appointments (barber_id, start_time);

-- ============================================================
-- closed_dates
-- ============================================================
create table public.closed_dates (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid references public.barbers(id) on delete cascade,  -- null = hele zaak
  date       date not null,
  reason     text,
  created_at timestamptz not null default now()
);

alter table public.closed_dates enable row level security;

-- Publieke site: leesbaar voor de booking flow (vrije slots berekenen)
create policy "Public can read closed dates"
  on public.closed_dates for select
  using (true);

-- Admin/developer: schrijven
create policy "Staff can manage closed dates"
  on public.closed_dates for all
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================
-- opening_hours (één rij per weekdag)
-- ============================================================
create table public.opening_hours (
  id          uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6),  -- 0 = zondag, 6 = zaterdag
  opens_at    time,    -- null als closed = true
  closes_at   time,    -- null als closed = true
  closed      boolean not null default false,
  constraint opening_hours_day_unique unique (day_of_week),
  constraint opening_hours_times_required check (
    closed = true or (opens_at is not null and closes_at is not null)
  ),
  constraint opening_hours_close_after_open check (
    closed = true or closes_at > opens_at
  )
);

alter table public.opening_hours enable row level security;

-- Publieke site: leesbaar
create policy "Public can read opening hours"
  on public.opening_hours for select
  using (true);

-- Admin/developer: schrijven
create policy "Staff can manage opening hours"
  on public.opening_hours for all
  using (public.is_staff())
  with check (public.is_staff());

-- ============================================================
-- business_settings (single-row config)
-- ============================================================
create table public.business_settings (
  id                   integer primary key default 1,
  phone                text,
  address              text,
  instagram_url        text,
  google_maps_place_id text,
  about_text_en        text,
  about_text_nl        text,
  about_text_es        text,
  translation_status   text not null default 'pending'
                         check (translation_status in ('pending', 'complete', 'failed')),
  updated_at           timestamptz not null default now(),
  constraint business_settings_single_row check (id = 1)
);

alter table public.business_settings enable row level security;

-- Publieke site: leesbaar (adres, telefoon, about-tekst)
create policy "Public can read business settings"
  on public.business_settings for select
  using (true);

-- Admin/developer: schrijven
create policy "Staff can manage business settings"
  on public.business_settings for all
  using (public.is_staff())
  with check (public.is_staff());

create trigger business_settings_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();
