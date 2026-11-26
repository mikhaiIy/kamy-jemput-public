-- Seed all 8 templates. Safe to re-run: ON CONFLICT updates price + active status.
INSERT INTO public.templates (id, name, category, price_myr, is_active) VALUES
  ('malay-wedding',    'Malay Wedding',           'wedding',   4900, true),
  ('chinese-wedding',  'Chinese Wedding',          'wedding',   4900, true),
  ('minimalist',       'Minimalist',               'wedding',   3900, true),
  ('birthday',         'Birthday',                 'birthday',  3900, true),
  ('corporate',        'Corporate',                'corporate', 4900, true),
  ('malay-wedding-v2', 'Malay Wedding Premium',    'wedding',   9900, true),
  ('chinese-wedding-v2','Chinese Wedding Premium', 'wedding',   9900, true),
  ('general-wedding',  'General Wedding',          'wedding',   9900, true)
ON CONFLICT (id) DO UPDATE
  SET name      = EXCLUDED.name,
      price_myr = EXCLUDED.price_myr,
      is_active = EXCLUDED.is_active;
