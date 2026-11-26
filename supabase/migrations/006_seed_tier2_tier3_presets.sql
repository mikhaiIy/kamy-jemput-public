-- Phase 3 + Phase 4 preset seeds.
--
-- Tier-2 (Phase 3): engagement_malay, aqiqah, anniversary, baby_shower,
-- and open_house_raya (originally planned for Phase 2 but deferred).
--
-- Tier-3 (Phase 4): corporate_dinner.
--
-- Each row carries a full v2 preset (type/theme/sections) so the editor
-- and renderer can use it without code changes.
-- Safe to re-run (UPSERT on id).

-- ============================================================================
-- open-house-raya (Phase 2 / 3 transition preset)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'open-house-raya',
  'Open House Raya',
  'wedding',
  4900,
  true,
  'open_house_raya',
  jsonb_build_object(
    'palette', 'pastel_green_gold',
    'fonts', jsonb_build_object('display', '--font-playfair', 'body', '--font-jakarta'),
    'animation', 'none',
    'background', jsonb_build_object('kind', 'solid', 'value', '#f3f7ee')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'photo_hero',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Rumah Terbuka Aidilfitri', 'subhead', 'Keluarga Baharudin', 'tagline', 'Anda Dijemput', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'Selamat Hari Raya', 'body', 'Dengan rendah hati kami menjemput saudara-mara dan rakan-rakan ke rumah terbuka kami.')),
    jsonb_build_object('type', 'quote',      'variant', 'centered',      'enabled', true, 'order', 2, 'data', jsonb_build_object('text', 'Selamat Hari Raya Aidilfitri, Maaf Zahir & Batin', 'attribution', '')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 3, 'data', jsonb_build_object('eventName', 'Rumah Terbuka', 'date', '', 'time', '11:00', 'venue', 'Rumah Keluarga Baharudin', 'address', 'No 12, Jalan Raya 5, 50450 Kuala Lumpur')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 4, 'data', jsonb_build_object('address', 'No 12, Jalan Raya 5, 50450 Kuala Lumpur', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 5, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Ahmad', 'phone', '+60 12-345 6789', 'role', 'Tuan Rumah')
    ))),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 6, 'data', jsonb_build_object('message', 'Kehadiran anda amat dihargai. Selamat Hari Raya.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- engagement-malay (Tier 2)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'engagement-malay',
  'Malay Engagement (Pertunangan)',
  'wedding',
  6900,
  true,
  'engagement_malay',
  jsonb_build_object(
    'palette', 'amber_rose',
    'fonts', jsonb_build_object('display', '--font-playfair', 'body', '--font-jakarta', 'script', '--font-great-vibes'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fdf6ec')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'photo_hero',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Siti & Ahmad', 'subhead', 'Majlis Pertunangan', 'tagline', 'Bertunang', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'Bismillahirrahmanirrahim', 'body', 'Dengan penuh kesyukuran kami menjemput Tuan/Puan ke majlis pertunangan kami.')),
    jsonb_build_object('type', 'quote',      'variant', 'centered',      'enabled', true, 'order', 2, 'data', jsonb_build_object('text', 'Semoga ikatan ini diberkati hingga ke jinjang pelamin.', 'attribution', '')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 3, 'data', jsonb_build_object('eventName', 'Majlis Pertunangan', 'date', '', 'time', '11:00', 'venue', 'Kediaman Pengantin', 'address', '')),
    jsonb_build_object('type', 'program',    'variant', 'timeline',      'enabled', true, 'order', 4, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '10:30 AM', 'event', 'Ketibaan rombongan'),
        jsonb_build_object('time', '11:00 AM', 'event', 'Majlis Merisik / Hantaran'),
        jsonb_build_object('time', '12:30 PM', 'event', 'Jamuan')
    ))),
    jsonb_build_object('type', 'dress_code', 'variant', 'swatch',        'enabled', false, 'order', 5, 'data', jsonb_build_object('theme', 'Pastel Pink & Putih', 'note', 'Pakaian tradisional digalakkan', 'swatchHex', '#f4d6dc')),
    jsonb_build_object('type', 'countdown',  'variant', 'digital',       'enabled', true, 'order', 6, 'data', jsonb_build_object('label', 'Menghitung Hari', 'targetDate', '')),
    jsonb_build_object('type', 'calendar',   'variant', 'buttons',       'enabled', true, 'order', 7, 'data', jsonb_build_object('titleOverride', '', 'eventName', 'Majlis Pertunangan', 'startsAt', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 8, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 9, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Siti',  'phone', '+60 12-345 6789', 'role', 'Pengantin Perempuan'),
        jsonb_build_object('name', 'Ahmad', 'phone', '+60 11-234 5678', 'role', 'Pengantin Lelaki')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 10, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 11, 'data', jsonb_build_object('message', 'Doa restu daripada anda amat kami hargai.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- aqiqah (Tier 2)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'aqiqah',
  'Aqiqah',
  'wedding',
  4900,
  true,
  'aqiqah',
  jsonb_build_object(
    'palette', 'sage_ivory',
    'fonts', jsonb_build_object('display', '--font-playfair', 'body', '--font-jakarta'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#f7f5ef')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'minimalist',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Majlis Aqiqah', 'subhead', 'Muhammad Adam', 'tagline', 'Anak Kepada Ahmad & Siti', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'Bismillahirrahmanirrahim', 'body', 'Bersyukur kepada Allah SWT, kami menjemput Tuan/Puan ke majlis aqiqah anak kami.')),
    jsonb_build_object('type', 'child_info', 'variant', 'centered',      'enabled', true, 'order', 2, 'data', jsonb_build_object('name', 'Muhammad Adam', 'dob', '', 'parents', 'Ahmad & Siti', 'photoUrl', '')),
    jsonb_build_object('type', 'quote',      'variant', 'centered',      'enabled', true, 'order', 3, 'data', jsonb_build_object('text', 'Ya Allah, jadikanlah dia anak yang soleh, berbakti dan beriman.', 'attribution', '')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 4, 'data', jsonb_build_object('eventName', 'Majlis Aqiqah', 'date', '', 'time', '11:00', 'venue', 'Kediaman', 'address', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 5, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 6, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Ahmad', 'phone', '+60 12-345 6789', 'role', 'Bapa')
    ))),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 7, 'data', jsonb_build_object('message', 'Doa dan kehadiran Tuan/Puan amat kami hargai.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- anniversary (Tier 2)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'anniversary',
  'Wedding Anniversary',
  'wedding',
  6900,
  true,
  'anniversary',
  jsonb_build_object(
    'palette', 'plum_gold',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta', 'script', '--font-great-vibes'),
    'animation', 'ken_burns',
    'background', jsonb_build_object('kind', 'solid', 'value', '#faf8f4')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'photo_hero',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', '25 Years', 'subhead', 'Sarah & Adam', 'tagline', 'Silver Anniversary', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'Celebrating 25 Years', 'body', 'Together with our family, we invite you to celebrate a quarter century of love and partnership.')),
    jsonb_build_object('type', 'quote',      'variant', 'centered',      'enabled', true, 'order', 2, 'data', jsonb_build_object('text', 'Love does not consist in gazing at each other, but in looking outward together.', 'attribution', 'Antoine de Saint-Exupéry')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 3, 'data', jsonb_build_object('eventName', '25th Anniversary Dinner', 'date', '', 'time', '19:00', 'venue', 'Mandarin Oriental', 'address', '')),
    jsonb_build_object('type', 'guestbook',  'variant', 'wishes_wall',   'enabled', true, 'order', 4, 'data', jsonb_build_object('allowPublic', true, 'title', 'Leave a wish', 'prompt', 'Share a memory with us')),
    jsonb_build_object('type', 'program',    'variant', 'timeline',      'enabled', true, 'order', 5, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '7:00 PM', 'event', 'Reception'),
        jsonb_build_object('time', '8:00 PM', 'event', 'Dinner & Toasts')
    ))),
    jsonb_build_object('type', 'countdown',  'variant', 'digital',       'enabled', true, 'order', 6, 'data', jsonb_build_object('label', 'Counting Down', 'targetDate', '')),
    jsonb_build_object('type', 'calendar',   'variant', 'plaque',        'enabled', true, 'order', 7, 'data', jsonb_build_object('titleOverride', 'Save the Date', 'eventName', '25th Anniversary Dinner', 'startsAt', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 8, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 9, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Sarah', 'phone', '+60 12-345 6789', 'role', '')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 10, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 11, 'data', jsonb_build_object('message', 'Thank you for being part of our journey.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- baby-shower (Tier 2)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'baby-shower',
  'Baby Shower',
  'birthday',
  4900,
  true,
  'baby_shower',
  jsonb_build_object(
    'palette', 'sage_ivory',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#f7f5ef')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'minimalist',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Baby Shower', 'subhead', 'Welcoming Baby Adam', 'tagline', 'A Sweet Beginning', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'Hello, little one!', 'body', 'Please join us as we celebrate the upcoming arrival of our little bundle.')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 2, 'data', jsonb_build_object('eventName', 'Baby Shower', 'date', '', 'time', '14:00', 'venue', 'Home', 'address', '')),
    jsonb_build_object('type', 'wishlist',   'variant', 'tabbed',        'enabled', true, 'order', 3, 'data', jsonb_build_object(
        'banks', jsonb_build_array(jsonb_build_object('bank', 'Maybank', 'accNumber', '', 'accName', '')),
        'qrCodes', jsonb_build_array(jsonb_build_object('method', 'DuitNow', 'name', '', 'phone', '')),
        'note', 'Your presence is gift enough — but if you wish to contribute…'
    )),
    jsonb_build_object('type', 'dress_code', 'variant', 'swatch',        'enabled', true, 'order', 4, 'data', jsonb_build_object('theme', 'Soft Pastels', 'note', 'Wear something soft and cosy!', 'swatchHex', '#f4d6dc')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 5, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 6, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Mom-to-be', 'phone', '+60 12-345 6789', 'role', '')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 7, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 8, 'data', jsonb_build_object('message', 'Thank you for showering us with love.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- corporate-dinner (Tier 3 / Phase 4)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'corporate-dinner',
  'Corporate Annual Dinner',
  'corporate',
  9900,
  true,
  'corporate_dinner',
  jsonb_build_object(
    'palette', 'minimal_ink',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fafafa')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'minimalist',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Annual Dinner 2026', 'subhead', 'Kamy Technologies Sdn Bhd', 'tagline', 'You are cordially invited', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'Welcome', 'body', 'Join us for an evening of celebration and recognition.')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 2, 'data', jsonb_build_object('eventName', 'Annual Dinner 2026', 'date', '', 'time', '19:00', 'venue', 'Kuala Lumpur Convention Centre', 'address', '')),
    jsonb_build_object('type', 'program',    'variant', 'timeline',      'enabled', true, 'order', 3, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '7:00 PM', 'event', 'Guest Arrival & Cocktails'),
        jsonb_build_object('time', '7:30 PM', 'event', 'Opening Speech'),
        jsonb_build_object('time', '8:00 PM', 'event', 'Dinner Service'),
        jsonb_build_object('time', '9:30 PM', 'event', 'Awards & Recognition'),
        jsonb_build_object('time', '10:30 PM', 'event', 'After Party')
    ))),
    jsonb_build_object('type', 'corporate_speakers', 'variant', 'grid', 'enabled', false, 'order', 4, 'data', jsonb_build_object('speakers', jsonb_build_array(
        jsonb_build_object('name', 'CEO Name', 'role', 'Chief Executive Officer', 'bio', '', 'photoUrl', '')
    ))),
    jsonb_build_object('type', 'dress_code', 'variant', 'swatch',        'enabled', true, 'order', 5, 'data', jsonb_build_object('theme', 'Black Tie / Smart Formal', 'note', 'Lounge suit or equivalent', 'swatchHex', '#1a1a1a')),
    jsonb_build_object('type', 'countdown',  'variant', 'digital',       'enabled', true, 'order', 6, 'data', jsonb_build_object('label', 'Counting Down', 'targetDate', '')),
    jsonb_build_object('type', 'calendar',   'variant', 'buttons',       'enabled', true, 'order', 7, 'data', jsonb_build_object('titleOverride', 'Add to Calendar', 'eventName', 'Annual Dinner 2026', 'startsAt', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 8, 'data', jsonb_build_object('address', 'Kuala Lumpur Convention Centre', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 9, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'HR Team', 'phone', '+60 3-2345 6789', 'role', 'Event Coordinator')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 10, 'data', jsonb_build_object('deadline', '', 'askPax', false, 'askDietary', true)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 11, 'data', jsonb_build_object('message', 'We look forward to celebrating with you.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;
