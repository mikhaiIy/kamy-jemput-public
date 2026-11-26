-- Seeds the "Celestial Story" Section-v2 template.
--
-- The catalogue's first dark template: one continuous night sky told from dusk
-- to dawn. Tap-to-light entrance, full-moon photo hero with shooting stars,
-- the love story charted as a constellation, a lunar-phase countdown, and the
-- guestbook as "lights left in the couple's sky". See
-- docs/DESIGN_CELESTIAL_STORY.md for the full design rationale.
--
-- No table schema changes — this is data only, like 005/006/008/013. Safe to
-- re-run. NOTE: remote migration history is drifted (only 001-002 recorded);
-- apply via SQL editor or scripts/seed-celestial-story.mjs, never a blind
-- `supabase db push`.

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'celestial-story',
  'Celestial Story',
  'wedding',
  13900,
  true,
  'wedding_general',
  jsonb_build_object(
    'palette', 'plum_gold',
    'preset', 'midnight_celestial',
    'colors', jsonb_build_object(
      'bg', '#101528',
      'text', '#eae4d6',
      'accent', '#e8c97e',
      'gold', '#c9a96a',
      'muted', '#8d97b8',
      'border', 'rgba(232,201,126,0.22)',
      'card', '#171f3a',
      'divider', '✦',
      'opening', 'Written in the stars'
    ),
    'fonts', jsonb_build_object(
      'display', '--font-cormorant',
      'body', '--font-jakarta',
      'script', '--font-great-vibes'
    ),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#101528')
  ),
  jsonb_build_array(
    -- Dusk · the sky is sealed; the guest taps to light the stars
    jsonb_build_object('type', 'landing',    'variant', 'celestial_gate',   'enabled', true, 'order',  0, 'data', jsonb_build_object('headline', 'Zara & Iskandar', 'subhead', 'Together with their families', 'tagline', 'Written in the Stars', 'coverPhotoUrl', '', 'eventDate', '')),
    -- Nightfall · the invitation
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered',    'enabled', true, 'order',  1, 'data', jsonb_build_object('greeting', 'Di Bawah Satu Langit', 'body', 'With hearts as full as the moon, Encik Hakim & Puan Sofia and Encik Rahman & Puan Zainab invite you to an evening beneath the stars — the wedding of their children.')),
    jsonb_build_object('type', 'quote',      'variant', 'centered',         'enabled', true, 'order',  2, 'data', jsonb_build_object('text', 'Every love story is written in the stars — ours is my favourite constellation.', 'attribution', '')),
    -- Midnight · their constellation
    jsonb_build_object('type', 'love_story', 'variant', 'constellation',    'enabled', true, 'order',  3, 'data', jsonb_build_object(
      'title', 'Buruj Kita',
      'intro', 'the constellation of us',
      'moments', jsonb_build_array(
        jsonb_build_object('label', 'The First Light', 'text', E'Two strangers under the same sky.\nOne look, and the night was never dark again.', 'photoUrl', ''),
        jsonb_build_object('label', 'Orbits Aligned',  'text', E'Different paths, one gravity.\nEvery turn kept pulling us closer.', 'photoUrl', ''),
        jsonb_build_object('label', 'One Sky, Forever','text', E'He asked beneath a sky full of stars.\nShe said yes before the next one fell.', 'photoUrl', '')
      ),
      'signature', 'Zara & Iskandar'
    )),
    jsonb_build_object('type', 'gallery',    'variant', 'designer',         'enabled', true, 'order',  4, 'data', jsonb_build_object(
      'title', 'Stardust',
      'intro', 'our night, in pictures',
      'blocks', jsonb_build_array(
        jsonb_build_object('layout', 'carousel', 'design', 'gallery_wall', 'photos', jsonb_build_array('', '', ''), 'caption', ''),
        jsonb_build_object('layout', 'duo',      'design', 'corner_tabs',  'photos', jsonb_build_array('', ''),     'caption', 'stardust & laughter')
      )
    )),
    -- The night itself · details
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',       'enabled', true, 'order',  5, 'data', jsonb_build_object('eventName', 'Majlis Resepsi', 'date', '', 'time', '20:00', 'venue', 'The Glasshouse at Seputeh', 'address', 'Jalan Bukit Seputeh, 58000 Kuala Lumpur')),
    jsonb_build_object('type', 'countdown',  'variant', 'lunar_phases',     'enabled', true, 'order',  6, 'data', jsonb_build_object('label', 'Menanti Bulan Penuh', 'targetDate', '')),
    jsonb_build_object('type', 'calendar',   'variant', 'month_grid',       'enabled', true, 'order',  7, 'data', jsonb_build_object('titleOverride', 'Save Our Date', 'eventName', 'Majlis Resepsi', 'startsAt', '')),
    jsonb_build_object('type', 'program',    'variant', 'timeline',         'enabled', true, 'order',  8, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '7:30 PM',  'event', 'Guest Arrival'),
        jsonb_build_object('time', '8:00 PM',  'event', 'Dinner Under the Stars'),
        jsonb_build_object('time', '9:30 PM',  'event', 'First Dance'),
        jsonb_build_object('time', '10:30 PM', 'event', 'Sky Lanterns & Farewell')
    ))),
    jsonb_build_object('type', 'dress_code', 'variant', 'swatch',           'enabled', true, 'order',  9, 'data', jsonb_build_object('theme', 'Midnight Formal', 'note', 'Deep blues, blacks & a touch of gold', 'swatchHex', '#16204a')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',       'enabled', true, 'order', 10, 'data', jsonb_build_object('address', 'Jalan Bukit Seputeh, 58000 Kuala Lumpur', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',             'enabled', true, 'order', 11, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Iskandar', 'phone', '+60 12-345 6789', 'role', 'Groom'),
        jsonb_build_object('name', 'Zara',     'phone', '+60 11-234 5678', 'role', 'Bride')
    ))),
    -- Before dawn · answer the sky (inheritTheme keeps the RSVP in the night palette)
    jsonb_build_object('type', 'rsvp',       'variant', 'romance_envelope', 'enabled', true, 'order', 12, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false, 'inheritTheme', true)),
    jsonb_build_object('type', 'guestbook',  'variant', 'wishes_wall',      'enabled', true, 'order', 13, 'data', jsonb_build_object('allowPublic', true, 'title', 'Lampu-Lampu Langit', 'prompt', 'Leave a little light in our sky — a wish for the couple.')),
    -- First light · thank you
    jsonb_build_object('type', 'thank_you',  'variant', 'card',             'enabled', true, 'order', 14, 'data', jsonb_build_object('message', 'From dusk to dawn, our brightest night is the one we share with you. Terima kasih kerana menjadi bintang di langit kami.'))
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
