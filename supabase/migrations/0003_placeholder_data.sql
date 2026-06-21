-- Migration: 0003_placeholder_data
-- Placeholder barbers en services voor fase 2 development
-- Vervang namen/prijzen later via het admin paneel

insert into public.barbers (name, photo_url, active) values
  ('Marcus Williams', null, true),
  ('James Thompson',  null, true),
  ('Carlos Rivera',   null, true);

insert into public.services (name_en, description_en, price, duration_minutes, translation_status) values
  ('Classic Haircut',    'A timeless cut tailored to your style, finished with a hot towel and styling.',  18.00, 30, 'pending'),
  ('Fade & Style',       'Precision fade blended to perfection, shaped and styled to your preference.',    22.00, 45, 'pending'),
  ('Beard Trim',         'Clean-up and shape of your beard, with straight-razor edge and hot towel.',      12.00, 20, 'pending'),
  ('Hair & Beard Combo', 'Full haircut combined with a beard trim — the complete look in one visit.',      28.00, 60, 'pending'),
  ('Kids Cut',           'Patient and friendly haircut for the little ones, up to 12 years old.',          14.00, 25, 'pending');
