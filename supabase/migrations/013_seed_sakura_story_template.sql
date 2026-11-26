-- Seeds the "Sakura Story" Section-v2 template.
--
-- jestudio-cherry-blossom-inspired storytelling template: tap-to-open entrance,
-- 3D depth parallax hero, chapterised love story, polaroid photo collages, a
-- month-grid save-the-date, and the kamy-jemput in-card RSVP (not an external
-- form). See docs/DESIGN_SAKURA_STORY.md for the full design rationale.
--
-- No table schema changes — this is data only, like 005/006/008. Safe to re-run.

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'sakura-story',
  'Sakura Story',
  'wedding',
  12900,
  true,
  'wedding_general',
  jsonb_build_object(
    'palette', 'sage_ivory',
    'preset', 'sakura_blush',
    'colors', jsonb_build_object(
      'bg', '#fffafb',
      'text', '#4a3a40',
      'accent', '#e8637f',
      'gold', '#c9a23c',
      'muted', '#7ab3c8',
      'border', 'rgba(232,99,127,0.22)',
      'card', '#ffffff',
      'divider', '✿',
      'opening', 'You are invited!'
    ),
    'fonts', jsonb_build_object(
      'display', '--font-cormorant',
      'body', '--font-jakarta',
      'script', '--font-dancing'
    ),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fffafb')
  ),
  jsonb_build_array(
    -- Chapter 0 · Entrance + hero (tap to open, 3D depth photo)
    jsonb_build_object('type', 'landing',    'variant', 'sakura_depth',     'enabled', true, 'order',  0, 'data', jsonb_build_object('headline', 'Alex & Mei', 'subhead', 'Together with their families', 'tagline', 'Wedding Invitation', 'coverPhotoUrl', '', 'eventDate', '')),
    -- Photo breather right after the hero (gallery is repeatable per card)
    jsonb_build_object('type', 'gallery',    'variant', 'designer', 'enabled', true, 'order',  1, 'data', jsonb_build_object(
      'title', '',
      'intro', '',
      'blocks', jsonb_build_array(
        jsonb_build_object('layout', 'single', 'design', 'arch_botanic', 'photos', jsonb_build_array(''), 'caption', 'You Are Invited!')
      )
    )),
    -- Chapter 1 · The invitation
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered',    'enabled', true, 'order',  2, 'data', jsonb_build_object('greeting', 'You Are Invited!', 'body', 'Mr & Mrs Chen and Mr & Mrs Lee joyfully invite you to celebrate the wedding of their children.')),
    -- Chapter 2 · Our story
    jsonb_build_object('type', 'love_story', 'variant', 'chapters',         'enabled', true, 'order',  3, 'data', jsonb_build_object(
      'title', 'Loving you,',
      'intro', 'is my favourite thing to do every single day',
      'moments', jsonb_build_array(
        jsonb_build_object('label', 'How We Met', 'text', E'He saw her. She saw him.\nTheir hearts said "oh, it''s you."', 'photoUrl', ''),
        jsonb_build_object('label', 'We Are Married', 'text', E'They said "just friends."\nThe universe laughed.\nHere we are.', 'photoUrl', '')
      ),
      'signature', 'Alex & Mei'
    )),
    -- Chapter 2½ · Photo collage (second gallery instance)
    jsonb_build_object('type', 'gallery',    'variant', 'designer', 'enabled', true, 'order',  4, 'data', jsonb_build_object(
      'title', 'Our Moments',
      'intro', 'happiness is within reach',
      'blocks', jsonb_build_array(
        jsonb_build_object('layout', 'carousel', 'design', 'postcard',       'photos', jsonb_build_array('', '', ''), 'caption', ''),
        jsonb_build_object('layout', 'duo',      'design', 'overlap_prints', 'photos', jsonb_build_array('', ''),     'caption', 'We are married')
      )
    )),
    jsonb_build_object('type', 'quote',      'variant', 'centered',         'enabled', true, 'order',  5, 'data', jsonb_build_object('text', 'The best moment in life is when you become "us".', 'attribution', '')),
    -- Chapter 3 · Save the date
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',       'enabled', true, 'order',  6, 'data', jsonb_build_object('eventName', 'Wedding Dinner', 'date', '', 'time', '18:30', 'venue', 'JW Marriott Hotel Kuala Lumpur', 'address', '183, Jalan Bukit Bintang, 55100 Kuala Lumpur')),
    jsonb_build_object('type', 'calendar',   'variant', 'month_grid',       'enabled', true, 'order',  7, 'data', jsonb_build_object('titleOverride', 'Save the Date', 'eventName', 'Wedding Dinner', 'startsAt', '')),
    jsonb_build_object('type', 'countdown',  'variant', 'digital',          'enabled', true, 'order',  8, 'data', jsonb_build_object('label', 'Counting Down', 'targetDate', '')),
    jsonb_build_object('type', 'program',    'variant', 'timeline',         'enabled', true, 'order',  9, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '9:30 AM',  'event', 'Ceremony'),
        jsonb_build_object('time', '12:30 PM', 'event', 'Luncheon'),
        jsonb_build_object('time', '6:30 PM',  'event', 'Dinner')
    ))),
    jsonb_build_object('type', 'dress_code', 'variant', 'swatch',           'enabled', true, 'order', 10, 'data', jsonb_build_object('theme', 'Smart Casual / Formal', 'note', 'Avoid all black', 'swatchHex', '#e8637f')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',       'enabled', true, 'order', 11, 'data', jsonb_build_object('address', '183, Jalan Bukit Bintang, 55100 Kuala Lumpur', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',             'enabled', true, 'order', 12, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Alex', 'phone', '+60 12-345 6789', 'role', 'Groom'),
        jsonb_build_object('name', 'Mei',  'phone', '+60 11-234 5678', 'role', 'Bride')
    ))),
    -- Chapter 4 · Come join us (kamy-jemput in-card RSVP)
    jsonb_build_object('type', 'rsvp',       'variant', 'romance_envelope', 'enabled', true, 'order', 13, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',             'enabled', true, 'order', 14, 'data', jsonb_build_object('message', 'This life has only one journey, and that journey is you. Thank you for celebrating with us.'))
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
