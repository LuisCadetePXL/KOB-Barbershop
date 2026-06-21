-- Migration: 0002_seed_defaults
-- Seed verplichte standaard-rijen zodat de app direct kan lezen zonder null-checks

-- Opening hours: placeholder — klant bevestigt exacte uren
-- 0 = zondag, 1 = maandag, ..., 6 = zaterdag
insert into public.opening_hours (day_of_week, opens_at, closes_at, closed) values
  (0, null,    null,    true),   -- zondag: gesloten
  (1, '09:00', '18:00', false),  -- maandag
  (2, '09:00', '18:00', false),  -- dinsdag
  (3, '09:00', '18:00', false),  -- woensdag
  (4, '09:00', '18:00', false),  -- donderdag
  (5, '09:00', '18:00', false),  -- vrijdag
  (6, '09:00', '17:00', false);  -- zaterdag

-- Business settings: één rij met placeholder content
insert into public.business_settings (id, phone, address, instagram_url, about_text_en, translation_status)
values (
  1,
  '+32 000 00 00 00',
  'Maarschalk Fochstraat 5, 3970 Leopoldsburg',
  'https://www.instagram.com/king_of_barber_belgium',
  'Welcome to King of Barber — your premium barbershop in Leopoldsburg.',
  'pending'
);
