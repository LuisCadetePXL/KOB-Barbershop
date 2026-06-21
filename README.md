# King of Barber — Barbershop Website

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase · next-intl

---

## Supabase project aanmaken en migraties uitvoeren

### 1. Supabase project aanmaken

1. Ga naar [supabase.com](https://supabase.com) en log in
2. Klik **New project**
3. Kies een naam (bv. `kob-barbershop`), regio **West EU (Frankfurt)**, stel een database-wachtwoord in
4. Wacht tot het project klaar is (~1 minuut)

### 2. API keys ophalen

Ga naar **Project Settings → API** en kopieer:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

Maak een `.env.local` aan op basis van `.env.local.example` en vul deze waarden in.

### 3. Migraties uitvoeren

De migratie-bestanden staan in `supabase/migrations/`. Je kunt ze uitvoeren via de Supabase SQL Editor:

1. Ga naar **SQL Editor** in het Supabase dashboard
2. Open `supabase/migrations/0001_initial_schema.sql`, kopieer de inhoud en klik **Run**
3. Open `supabase/migrations/0002_seed_defaults.sql`, kopieer de inhoud en klik **Run**

**Of** via de Supabase CLI (optioneel, voor later):

```bash
npx supabase link --project-ref jouw-project-id
npx supabase db push
```

### 4. Admin-gebruiker aanmaken

Na de migraties: maak een gebruiker aan via **Authentication → Users → Add user** in het dashboard. Voer daarna dit SQL-snippet uit in de SQL Editor om de rol in te stellen:

```sql
insert into public.profiles (id, role)
values ('<uuid-van-de-gebruiker>', 'developer');
```

---

## Development starten

```bash
cp .env.local.example .env.local
# vul .env.local in met je Supabase keys

npm install
npm run dev
```

App draait op [http://localhost:3000](http://localhost:3000).

---

## Mappenstructuur

```
app/
  (public)/        # publieke site (/nl, /en, /es) — fase 2-3
  admin/           # admin paneel — fase 4-6
  api/             # API routes
lib/
  supabase/
    client.ts      # browser client (client components)
    server.ts      # server client (server components, API routes)
messages/          # next-intl vertaalbestanden (nl.json, en.json, es.json) — fase 3
supabase/
  migrations/      # SQL migraties
types/
  database.ts      # TypeScript types voor alle tabellen
```

---

## Bouwvolgorde (fasering)

1. ✅ **Project setup + datamodel** — Next.js skeleton, Supabase schema
2. Publieke site, statisch — pagina's met placeholder content
3. Meertaligheid — next-intl routing, taalwisselaar
4. Auth + admin skelet — login, middleware, rol-onderscheid
5. Admin CRUD — barbers, prijzen, openingsuren, sluitingsdagen
6. Auto-vertaling — DeepL API integratie
7. Booking flow — service/barber/tijdslot kiezen
8. Google Calendar integratie
9. Twilio WhatsApp integratie
10. Polish, testing, deploy
