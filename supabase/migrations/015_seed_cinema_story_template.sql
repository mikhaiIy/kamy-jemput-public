-- Seeds the "Cinema Story" Section-v2 template.
--
-- The wedding told as a film premiere (inspired by jestudio's episode-one
-- demo): a black title card the guest "plays" (▶), STARRING credits with a
-- letter-spacing title reveal, the love story as numbered episodes in film
-- frames, a film-leader countdown to the premiere, a filmstrip gallery, and
-- the guestbook as audience reviews. See docs/DESIGN_CINEMA_STORY.md for the
-- full design rationale.
--
-- No table schema changes — this is data only, like 005/006/008/013/014. Safe
-- to re-run. NOTE: remote migration history is drifted (only 001-002
-- recorded); apply via SQL editor or scripts/seed-cinema-story.mjs, never a
-- blind `supabase db push`.

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'cinema-story',
  'Cinema Story',
  'wedding',
  14900,
  true,
  'wedding_general',
  jsonb_build_object(
    'palette', 'minimal_ink',
    'preset', 'editorial_cinema',
    'colors', jsonb_build_object(
      'bg', '#fafaf9',
      'text', '#1a1a1a',
      'accent', '#0d0d0d',
      'gold', '#b8a070',
      'muted', '#888880',
      'border', 'rgba(13,13,13,0.14)',
      'card', '#f5f4f2',
      'divider', '✳',
      'opening', 'A Wedding Production'
    ),
    'fonts', jsonb_build_object(
      'display', '--font-bodoni',
      'body', '--font-jakarta',
      'script', '--font-bodoni'
    ),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fafaf9')
  ),
  jsonb_build_array(
    -- Opening title card · the guest taps ▶ to start the screening
    jsonb_build_object('type', 'landing',    'variant', 'premiere_gate',    'enabled', true, 'order',  0, 'data', jsonb_build_object('headline', 'Amira & Daniel', 'subhead', 'Directed by Fate · Produced by Love', 'tagline', 'Our Love Story', 'coverPhotoUrl', '', 'eventDate', '')),
    -- Episode 01 · A Joyful Invitation
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered',    'enabled', true, 'order',  1, 'data', jsonb_build_object('greeting', 'A Joyful Invitation', 'body', 'Together with their families, Encik Farid & Puan Laila and Mr Tan & Mrs Mei, we joyfully invite you to the first screening of a lifelong feature — the wedding of Amira & Daniel.')),
    jsonb_build_object('type', 'quote',      'variant', 'centered',         'enabled', true, 'order',  2, 'data', jsonb_build_object('text', 'Began with a moment, became a forever.', 'attribution', '')),
    -- Episode 02 · the series so far
    jsonb_build_object('type', 'love_story', 'variant', 'film_episodes',    'enabled', true, 'order',  3, 'data', jsonb_build_object(
      'title', 'The Series',
      'intro', 'three episodes, one forever',
      'moments', jsonb_build_array(
        jsonb_build_object('label', 'Where It All Began',  'text', E'A crowded room, an empty seat beside her.\nI didn''t know it then, but that was the moment everything changed.', 'photoUrl', ''),
        jsonb_build_object('label', 'Falling Together',    'text', E'Late-night calls that forgot to end.\nTwo scripts slowly becoming one story.', 'photoUrl', ''),
        jsonb_build_object('label', 'Forever Starts Now',  'text', E'No cliffhanger this time.\nHe asked. She said yes. Roll credits — and begin again.', 'photoUrl', '')
      ),
      'signature', 'And I choose you, again and again, every single day.'
    )),
    jsonb_build_object('type', 'gallery',    'variant', 'designer',         'enabled', true, 'order',  4, 'data', jsonb_build_object(
      'title', 'Behind the Scenes',
      'intro', 'stills from the making of us',
      'blocks', jsonb_build_array(
        jsonb_build_object('layout', 'carousel', 'design', 'filmstrip',   'photos', jsonb_build_array('', '', ''), 'caption', ''),
        jsonb_build_object('layout', 'duo',      'design', 'album_pages', 'photos', jsonb_build_array('', ''),     'caption', 'the supporting cast')
      )
    )),
    -- Episode 03 · the premiere details
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',       'enabled', true, 'order',  5, 'data', jsonb_build_object('eventName', 'Majlis Resepsi', 'date', '', 'time', '19:30', 'venue', 'The Majestic Hotel Kuala Lumpur', 'address', '5 Jalan Sultan Hishamuddin, 50000 Kuala Lumpur')),
    jsonb_build_object('type', 'countdown',  'variant', 'film_leader',      'enabled', true, 'order',  6, 'data', jsonb_build_object('label', 'Tayangan Perdana Dalam', 'targetDate', '')),
    jsonb_build_object('type', 'calendar',   'variant', 'month_grid',       'enabled', true, 'order',  7, 'data', jsonb_build_object('titleOverride', 'Save the Date', 'eventName', 'Majlis Resepsi', 'startsAt', '')),
    jsonb_build_object('type', 'program',    'variant', 'timeline',         'enabled', true, 'order',  8, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '7:00 PM',  'event', 'Red Carpet Arrival'),
        jsonb_build_object('time', '7:30 PM',  'event', 'Opening Scene — Dinner is Served'),
        jsonb_build_object('time', '9:00 PM',  'event', 'The First Dance'),
        jsonb_build_object('time', '10:30 PM', 'event', 'Closing Credits & Farewell')
    ))),
    jsonb_build_object('type', 'dress_code', 'variant', 'swatch',           'enabled', true, 'order',  9, 'data', jsonb_build_object('theme', 'Black Tie Optional', 'note', 'Ink, ivory & a touch of gold', 'swatchHex', '#0d0d0d')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',       'enabled', true, 'order', 10, 'data', jsonb_build_object('address', '5 Jalan Sultan Hishamuddin, 50000 Kuala Lumpur', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',             'enabled', true, 'order', 11, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Daniel', 'phone', '+60 12-345 6789', 'role', 'Groom'),
        jsonb_build_object('name', 'Amira',  'phone', '+60 11-234 5678', 'role', 'Bride')
    ))),
    -- Episode 04 · reserve your seat (inheritTheme keeps the RSVP in ink & gold)
    jsonb_build_object('type', 'rsvp',       'variant', 'romance_envelope', 'enabled', true, 'order', 12, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false, 'inheritTheme', true)),
    jsonb_build_object('type', 'guestbook',  'variant', 'wishes_wall',      'enabled', true, 'order', 13, 'data', jsonb_build_object('allowPublic', true, 'title', 'The Reviews', 'prompt', 'Leave a five-star review for the couple — your wishes are our favourite critics'' quotes.')),
    -- Post-credits · thank you
    jsonb_build_object('type', 'thank_you',  'variant', 'card',             'enabled', true, 'order', 14, 'data', jsonb_build_object('message', 'To be continued… Terima kasih kerana menjadi sebahagian daripada episod pertama kami. This story only gets better with you in it.'))
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
