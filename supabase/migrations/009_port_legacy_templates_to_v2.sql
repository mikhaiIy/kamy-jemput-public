-- Phase 2.6 — port the 5 original templates to Section-v2.
--
-- Before this migration, these 5 rows had `type/theme/sections = null` so
-- /dashboard/cards/new fell through to the legacy single-form CustomizationForm.
-- After this migration, every active template is Section-v2 and every new
-- customer is routed to the three-pane editor with live preview.
--
-- Differentiation vs the existing v2 "Premium" templates:
--   malay-wedding         (RM 49) — basic Section set, no program/countdown/calendar/wishlist
--   malay-wedding-v2      (RM 99) — full preset including program/countdown/calendar/guestbook
--   chinese-wedding       (RM 49) — basic Section set
--   chinese-wedding-v2    (RM 99) — full preset (008)
--
-- birthday/corporate/minimalist had no v2 sibling; this is their first v2 form.
--
-- Existing cards purchased on legacy form keep their legacy custom_data
-- (renderer dispatches on `isSectionCard(data)` — these untouched).
-- Safe to re-run.

-- ============================================================================
-- malay-wedding (Tier 1 — basic)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'malay-wedding',
  'Malay Wedding',
  'wedding',
  4900,
  true,
  'wedding_malay',
  jsonb_build_object(
    'palette', 'amber_rose',
    'fonts', jsonb_build_object('display', '--font-playfair', 'body', '--font-jakarta'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fdf6ec')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'photo_hero',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Siti & Ahmad', 'subhead', 'Walimatulurus', 'tagline', 'Anda Dijemput', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'Bismillahirrahmanirrahim', 'body', 'Dengan penuh kesyukuran, kami menjemput Tuan/Puan ke majlis perkahwinan kami.')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 2, 'data', jsonb_build_object('eventName', 'Walimatulurus', 'date', '', 'time', '11:00', 'venue', '', 'address', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 3, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 4, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Siti',  'phone', '+60 12-345 6789', 'role', 'Pengantin Perempuan'),
        jsonb_build_object('name', 'Ahmad', 'phone', '+60 11-234 5678', 'role', 'Pengantin Lelaki')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 5, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 6, 'data', jsonb_build_object('message', 'Kehadiran dan doa restu daripada Tuan/Puan amat kami hargai.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- chinese-wedding (Tier 1 — basic)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'chinese-wedding',
  'Chinese Wedding',
  'wedding',
  4900,
  true,
  'wedding_chinese',
  jsonb_build_object(
    'palette', 'red_gold',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fff7e8')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'photo_hero',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Mei Ling & Wei Ming', 'subhead', '囍 Our Wedding 囍', 'tagline', 'Together Forever', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', '囍 Double Happiness', 'body', 'With joyful hearts, our families invite you to celebrate our wedding day.')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 2, 'data', jsonb_build_object('eventName', 'Wedding Dinner', 'date', '', 'time', '18:30', 'venue', '', 'address', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 3, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 4, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Mei Ling', 'phone', '+60 12-345 6789', 'role', 'Bride'),
        jsonb_build_object('name', 'Wei Ming', 'phone', '+60 11-234 5678', 'role', 'Groom')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 5, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', true)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 6, 'data', jsonb_build_object('message', 'Thank you for sharing in our joy. 多谢!'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- birthday (Tier 1 — basic)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'birthday',
  'Birthday',
  'birthday',
  3900,
  true,
  'birthday_milestone',
  jsonb_build_object(
    'palette', 'amber_rose',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fdf6ec')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'photo_hero',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Happy Birthday', 'subhead', 'Sarah turns 30', 'tagline', 'Celebrate with us', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'You are invited', 'body', 'Join us for an evening of cake, laughter, and good company.')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 2, 'data', jsonb_build_object('eventName', 'Birthday Party', 'date', '', 'time', '19:00', 'venue', '', 'address', '')),
    jsonb_build_object('type', 'countdown',  'variant', 'digital',       'enabled', true, 'order', 3, 'data', jsonb_build_object('label', 'Counting Down', 'targetDate', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 4, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 5, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Sarah', 'phone', '+60 12-345 6789', 'role', '')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 6, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 7, 'data', jsonb_build_object('message', 'Thank you for celebrating with me.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- corporate (Tier 1 — basic)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'corporate',
  'Corporate',
  'corporate',
  4900,
  true,
  'corporate_dinner',
  jsonb_build_object(
    'palette', 'minimal_ink',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fafafa')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'minimalist',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Corporate Event', 'subhead', 'Your Company', 'tagline', 'You are invited', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'Welcome', 'body', 'We are pleased to invite you to our upcoming event.')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 2, 'data', jsonb_build_object('eventName', 'Corporate Event', 'date', '', 'time', '18:00', 'venue', '', 'address', '')),
    jsonb_build_object('type', 'program',    'variant', 'timeline',      'enabled', true, 'order', 3, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '6:00 PM', 'event', 'Registration'),
        jsonb_build_object('time', '6:30 PM', 'event', 'Opening remarks'),
        jsonb_build_object('time', '7:00 PM', 'event', 'Programme')
    ))),
    jsonb_build_object('type', 'dress_code', 'variant', 'swatch',        'enabled', true, 'order', 4, 'data', jsonb_build_object('theme', 'Smart Casual', 'note', '', 'swatchHex', '#1a1a1a')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 5, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 6, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Event Coordinator', 'phone', '+60 3-2345 6789', 'role', '')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 7, 'data', jsonb_build_object('deadline', '', 'askPax', false, 'askDietary', true)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 8, 'data', jsonb_build_object('message', 'We look forward to seeing you.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- minimalist (Tier 1 — basic, multi-purpose)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'minimalist',
  'Minimalist',
  'wedding',
  3900,
  true,
  'wedding_general',
  jsonb_build_object(
    'palette', 'minimal_ink',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta'),
    'animation', 'none',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fafafa')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'minimalist',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'You are invited', 'subhead', 'Sarah & Adam', 'tagline', '', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'Together with our families', 'body', 'We invite you to share in a celebration of our union.')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 2, 'data', jsonb_build_object('eventName', 'Ceremony', 'date', '', 'time', '16:00', 'venue', '', 'address', '')),
    jsonb_build_object('type', 'calendar',   'variant', 'buttons',       'enabled', true, 'order', 3, 'data', jsonb_build_object('titleOverride', '', 'eventName', 'Ceremony', 'startsAt', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 4, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 5, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Sarah', 'phone', '+60 12-345 6789', 'role', '')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 6, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 7, 'data', jsonb_build_object('message', 'Thank you for being part of our day.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;
