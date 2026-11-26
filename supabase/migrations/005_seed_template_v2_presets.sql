-- Seeds the first Section-v2 templates.
--
-- These rows have `type`, `theme`, and `sections` populated so the customisation
-- form and renderer can pull the preset directly from the DB. Legacy templates
-- continue to use category + config_schema and are unaffected.
--
-- Safe to re-run.

-- ----- malay-wedding-v2 ---------------------------------------------------

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'malay-wedding-v2',
  'Malay Wedding Premium',
  'wedding',
  9900,
  true,
  'wedding_malay',
  jsonb_build_object(
    'palette', 'amber_rose',
    'fonts', jsonb_build_object(
      'display', '--font-playfair',
      'body', '--font-jakarta',
      'script', '--font-great-vibes'
    ),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fdf6ec')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',     'variant', 'photo_hero',     'enabled', true, 'order',  0, 'data', jsonb_build_object('headline', 'Sarah & Adam', 'subhead', '', 'tagline', 'Walimatul Urus', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',     'variant', 'card_centered',  'enabled', true, 'order',  1, 'data', jsonb_build_object('greeting', 'Bismillahirrahmanirrahim', 'body', 'Dengan penuh kesyukuran, kami menjemput Dato''/Datin/Tuan/Puan ke majlis perkahwinan kami.')),
    jsonb_build_object('type', 'quote',       'variant', 'centered',       'enabled', true, 'order',  2, 'data', jsonb_build_object('text', 'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan dari jenismu sendiri.', 'attribution', 'Surah Ar-Rum: 21')),
    jsonb_build_object('type', 'event_info',  'variant', 'card_stack',     'enabled', true, 'order',  3, 'data', jsonb_build_object('eventName', 'Walimatul Urus', 'date', '', 'time', '11:00', 'venue', 'Dewan Seri Budiman', 'address', 'Jalan Ampang, 50450 Kuala Lumpur')),
    jsonb_build_object('type', 'program',     'variant', 'timeline',       'enabled', true, 'order',  4, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '11:00 AM', 'event', 'Ketibaan tetamu'),
        jsonb_build_object('time', '12:30 PM', 'event', 'Majlis persandingan'),
        jsonb_build_object('time',  '1:00 PM', 'event', 'Jamuan makan')
    ))),
    jsonb_build_object('type', 'countdown',   'variant', 'digital',        'enabled', true, 'order',  5, 'data', jsonb_build_object('label', 'Menghitung Hari', 'targetDate', '')),
    jsonb_build_object('type', 'calendar',    'variant', 'buttons',        'enabled', true, 'order',  6, 'data', jsonb_build_object('titleOverride', '', 'eventName', 'Walimatul Urus', 'startsAt', '')),
    jsonb_build_object('type', 'map',         'variant', 'button_row',     'enabled', true, 'order',  7, 'data', jsonb_build_object('address', 'Jalan Ampang, 50450 Kuala Lumpur', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',     'variant', 'list',           'enabled', true, 'order',  8, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Sarah', 'phone', '+60 12-345 6789', 'role', 'Pengantin Perempuan'),
        jsonb_build_object('name', 'Adam',  'phone', '+60 11-234 5678', 'role', 'Pengantin Lelaki')
    ))),
    jsonb_build_object('type', 'rsvp',        'variant', 'classic',        'enabled', true, 'order',  9, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false)),
    jsonb_build_object('type', 'thank_you',   'variant', 'card',           'enabled', true, 'order', 10, 'data', jsonb_build_object('message', 'Kehadiran dan doa restu daripada anda amat kami hargai. Sekian terima kasih.'))
  )
)
on conflict (id) do update set
  name      = excluded.name,
  category  = excluded.category,
  price_myr = excluded.price_myr,
  is_active = excluded.is_active,
  type      = excluded.type,
  theme     = excluded.theme,
  sections  = excluded.sections;

-- ----- general-wedding-v2 (Phase 2 preset) --------------------------------

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'general-wedding',
  'General Wedding (Section v2)',
  'wedding',
  8900,
  true,
  'wedding_general',
  jsonb_build_object(
    'palette', 'sage_ivory',
    'fonts', jsonb_build_object(
      'display', '--font-cormorant',
      'body', '--font-jakarta',
      'script', '--font-great-vibes'
    ),
    'animation', 'ken_burns',
    'background', jsonb_build_object('kind', 'solid', 'value', '#f7f5ef')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',     'variant', 'minimalist',     'enabled', true, 'order',  0, 'data', jsonb_build_object('headline', 'Isabella & James', 'subhead', '& ', 'tagline', 'The Wedding of', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',     'variant', 'card_centered',  'enabled', true, 'order',  1, 'data', jsonb_build_object('greeting', 'Welcome', 'body', 'Together with their families, Isabella and James joyfully invite you to celebrate their wedding.')),
    jsonb_build_object('type', 'event_info',  'variant', 'card_stack',     'enabled', true, 'order',  2, 'data', jsonb_build_object('eventName', 'Wedding Reception', 'date', '', 'time', '17:00', 'venue', 'Grand Hyatt Kuala Lumpur', 'address', '12 Jalan Pinang, 50450 Kuala Lumpur')),
    jsonb_build_object('type', 'program',     'variant', 'timeline',       'enabled', true, 'order',  3, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '4:00 PM', 'event', 'Guest Arrival'),
        jsonb_build_object('time', '5:00 PM', 'event', 'Ceremony'),
        jsonb_build_object('time', '6:30 PM', 'event', 'Cocktail Hour'),
        jsonb_build_object('time', '8:00 PM', 'event', 'Reception Dinner')
    ))),
    jsonb_build_object('type', 'countdown',   'variant', 'digital',        'enabled', true, 'order',  4, 'data', jsonb_build_object('label', 'Counting Down', 'targetDate', '')),
    jsonb_build_object('type', 'calendar',    'variant', 'plaque',         'enabled', true, 'order',  5, 'data', jsonb_build_object('titleOverride', 'Save the Date', 'eventName', 'Wedding Reception', 'startsAt', '')),
    jsonb_build_object('type', 'map',         'variant', 'button_row',     'enabled', true, 'order',  6, 'data', jsonb_build_object('address', '12 Jalan Pinang, 50450 Kuala Lumpur', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',     'variant', 'list',           'enabled', true, 'order',  7, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Isabella', 'phone', '+60 12-345 6789', 'role', 'Bride'),
        jsonb_build_object('name', 'James',    'phone', '+60 11-234 5678', 'role', 'Groom')
    ))),
    jsonb_build_object('type', 'rsvp',        'variant', 'classic',        'enabled', true, 'order',  8, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false)),
    jsonb_build_object('type', 'thank_you',   'variant', 'card',           'enabled', true, 'order',  9, 'data', jsonb_build_object('message', 'Your presence is the greatest gift. Thank you for celebrating with us.'))
  )
)
on conflict (id) do update set
  name      = excluded.name,
  category  = excluded.category,
  price_myr = excluded.price_myr,
  is_active = excluded.is_active,
  type      = excluded.type,
  theme     = excluded.theme,
  sections  = excluded.sections;
