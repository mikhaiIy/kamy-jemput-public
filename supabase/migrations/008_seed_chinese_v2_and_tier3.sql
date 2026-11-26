-- Phase 2 catalog fix + Phase 4 catalog completion.
--
-- 1. chinese-wedding-v2 was previously listed as "Premium" but had no Section-v2
--    data — it fell through to the legacy renderer with the editor UX of the
--    old templates. Promote it to a real Section-v2 preset with red_gold palette.
-- 2. Seed the four remaining Tier-3 catalogue rows: graduation, gender_reveal,
--    corporate_launch, workshop_seminar. Each reuses existing Sections only.
--
-- Safe to re-run (UPSERT on id). Existing published cards on these templates
-- keep their custom_data — the renderer dispatches on `isSectionCard(data)`,
-- so legacy cards continue to render via the legacy path.

-- ============================================================================
-- chinese-wedding-v2 (Phase 2 catalog fix — now a real v2 preset)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'chinese-wedding-v2',
  'Chinese Wedding Premium',
  'wedding',
  9900,
  true,
  'wedding_chinese',
  jsonb_build_object(
    'palette', 'red_gold',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta', 'script', '--font-great-vibes'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fff7e8')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'photo_hero',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Mei Ling & Wei Ming', 'subhead', '囍 Our Wedding 囍', 'tagline', 'Together Forever', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', '囍 Double Happiness', 'body', 'With joyful hearts, our families invite you to celebrate our wedding day.')),
    jsonb_build_object('type', 'quote',      'variant', 'centered',      'enabled', true, 'order', 2, 'data', jsonb_build_object('text', '百年好合 — A hundred years of harmony', 'attribution', '')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 3, 'data', jsonb_build_object('eventName', 'Wedding Dinner', 'date', '', 'time', '18:30', 'venue', 'Grand Ballroom', 'address', '')),
    jsonb_build_object('type', 'program',    'variant', 'timeline',      'enabled', true, 'order', 4, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '6:30 PM', 'event', 'Cocktail reception'),
        jsonb_build_object('time', '7:30 PM', 'event', 'Tea ceremony'),
        jsonb_build_object('time', '8:00 PM', 'event', 'Dinner & toasts'),
        jsonb_build_object('time', '10:00 PM', 'event', 'After party')
    ))),
    jsonb_build_object('type', 'countdown',  'variant', 'digital',       'enabled', true, 'order', 5, 'data', jsonb_build_object('label', 'Counting Down', 'targetDate', '')),
    jsonb_build_object('type', 'wishlist',   'variant', 'tabbed',        'enabled', true, 'order', 6, 'data', jsonb_build_object(
        'banks', jsonb_build_array(jsonb_build_object('bank', 'Maybank', 'accNumber', '', 'accName', '')),
        'qrCodes', jsonb_build_array(jsonb_build_object('method', 'DuitNow', 'name', '', 'phone', '')),
        'note', 'Ang pao — your presence is the greatest gift.'
    )),
    jsonb_build_object('type', 'calendar',   'variant', 'buttons',       'enabled', true, 'order', 7, 'data', jsonb_build_object('titleOverride', '', 'eventName', 'Wedding Dinner', 'startsAt', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 8, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'guestbook',  'variant', 'wishes_wall',   'enabled', true, 'order', 9, 'data', jsonb_build_object('allowPublic', true, 'title', 'Wishes for the couple', 'prompt', 'Leave a blessing for Mei Ling & Wei Ming')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 10, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Mei Ling', 'phone', '+60 12-345 6789', 'role', 'Bride'),
        jsonb_build_object('name', 'Wei Ming', 'phone', '+60 11-234 5678', 'role', 'Groom')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 11, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', true)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 12, 'data', jsonb_build_object('message', 'Thank you for sharing in our joy. 多谢!'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- graduation (Tier 3 / Phase 4)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'graduation',
  'Graduation Convocation',
  'birthday',
  6900,
  true,
  'graduation',
  jsonb_build_object(
    'palette', 'plum_gold',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta', 'script', '--font-great-vibes'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#faf8f4')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'photo_hero',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Class of 2026', 'subhead', 'Ahmad bin Ali', 'tagline', 'Graduation Day', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'We Made It', 'body', 'With pride and gratitude, we invite you to celebrate this milestone with us.')),
    jsonb_build_object('type', 'quote',      'variant', 'centered',      'enabled', true, 'order', 2, 'data', jsonb_build_object('text', 'The future belongs to those who believe in the beauty of their dreams.', 'attribution', 'Eleanor Roosevelt')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 3, 'data', jsonb_build_object('eventName', 'Convocation Ceremony', 'date', '', 'time', '10:00', 'venue', 'University Hall', 'address', '')),
    jsonb_build_object('type', 'program',    'variant', 'timeline',      'enabled', true, 'order', 4, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '9:30 AM',  'event', 'Guest arrival'),
        jsonb_build_object('time', '10:00 AM', 'event', 'Procession & ceremony'),
        jsonb_build_object('time', '12:00 PM', 'event', 'Photo session'),
        jsonb_build_object('time', '1:00 PM',  'event', 'Family lunch')
    ))),
    jsonb_build_object('type', 'countdown',  'variant', 'digital',       'enabled', true, 'order', 5, 'data', jsonb_build_object('label', 'Counting Down', 'targetDate', '')),
    jsonb_build_object('type', 'calendar',   'variant', 'buttons',       'enabled', true, 'order', 6, 'data', jsonb_build_object('titleOverride', 'Add to Calendar', 'eventName', 'Convocation Ceremony', 'startsAt', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 7, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'dress_code', 'variant', 'swatch',        'enabled', true, 'order', 8, 'data', jsonb_build_object('theme', 'Smart Casual', 'note', 'Convocation robes for graduand', 'swatchHex', '#2c1a4a')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 9, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Ahmad', 'phone', '+60 12-345 6789', 'role', 'Graduand')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 10, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 11, 'data', jsonb_build_object('message', 'Thank you for being part of this journey.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- gender-reveal (Tier 3 / Phase 4)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'gender-reveal',
  'Gender Reveal',
  'birthday',
  4900,
  true,
  'gender_reveal',
  jsonb_build_object(
    'palette', 'amber_rose',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta', 'script', '--font-great-vibes'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fdf6ec')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'minimalist',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Boy or Girl?', 'subhead', 'Baby Adam — Coming Soon', 'tagline', 'Gender Reveal Party', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'The big reveal!', 'body', 'Pink or blue? Place your bets and join us as we find out together.')),
    jsonb_build_object('type', 'quote',      'variant', 'centered',      'enabled', true, 'order', 2, 'data', jsonb_build_object('text', 'A little miracle is on the way.', 'attribution', '')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 3, 'data', jsonb_build_object('eventName', 'Gender Reveal Party', 'date', '', 'time', '15:00', 'venue', 'Home', 'address', '')),
    jsonb_build_object('type', 'countdown',  'variant', 'digital',       'enabled', true, 'order', 4, 'data', jsonb_build_object('label', 'Reveal Countdown', 'targetDate', '')),
    jsonb_build_object('type', 'dress_code', 'variant', 'swatch',        'enabled', true, 'order', 5, 'data', jsonb_build_object('theme', 'Pink or Blue?', 'note', 'Wear your guess — let us know who is on Team Pink and Team Blue!', 'swatchHex', '#f4d6dc')),
    jsonb_build_object('type', 'calendar',   'variant', 'buttons',       'enabled', true, 'order', 6, 'data', jsonb_build_object('titleOverride', '', 'eventName', 'Gender Reveal Party', 'startsAt', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 7, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 8, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Mom-to-be', 'phone', '+60 12-345 6789', 'role', '')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 9, 'data', jsonb_build_object('deadline', '', 'askPax', true, 'askDietary', false)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 10, 'data', jsonb_build_object('message', 'Thank you for celebrating with us.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- corporate-launch (Tier 3 / Phase 4)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'corporate-launch',
  'Corporate Product Launch',
  'corporate',
  9900,
  true,
  'corporate_launch',
  jsonb_build_object(
    'palette', 'minimal_ink',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fafafa')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'minimalist',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'Product Launch 2026', 'subhead', 'Kamy Technologies', 'tagline', 'Unveiling what is next', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'You are invited', 'body', 'Join us for the unveiling of our latest product and a glimpse into what we are building.')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 2, 'data', jsonb_build_object('eventName', 'Product Launch 2026', 'date', '', 'time', '14:00', 'venue', 'Innovation Centre', 'address', '')),
    jsonb_build_object('type', 'program',    'variant', 'timeline',      'enabled', true, 'order', 3, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '2:00 PM', 'event', 'Registration & networking'),
        jsonb_build_object('time', '2:30 PM', 'event', 'Keynote presentation'),
        jsonb_build_object('time', '3:30 PM', 'event', 'Product demo'),
        jsonb_build_object('time', '4:30 PM', 'event', 'Q&A and refreshments')
    ))),
    jsonb_build_object('type', 'corporate_speakers', 'variant', 'grid',  'enabled', true, 'order', 4, 'data', jsonb_build_object('speakers', jsonb_build_array(
        jsonb_build_object('name', 'CEO Name', 'role', 'Chief Executive Officer', 'bio', '', 'photoUrl', ''),
        jsonb_build_object('name', 'CTO Name', 'role', 'Chief Technology Officer', 'bio', '', 'photoUrl', '')
    ))),
    jsonb_build_object('type', 'dress_code', 'variant', 'swatch',        'enabled', true, 'order', 5, 'data', jsonb_build_object('theme', 'Business Casual', 'note', '', 'swatchHex', '#1a1a1a')),
    jsonb_build_object('type', 'countdown',  'variant', 'digital',       'enabled', true, 'order', 6, 'data', jsonb_build_object('label', 'Launching In', 'targetDate', '')),
    jsonb_build_object('type', 'calendar',   'variant', 'buttons',       'enabled', true, 'order', 7, 'data', jsonb_build_object('titleOverride', 'Add to Calendar', 'eventName', 'Product Launch 2026', 'startsAt', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 8, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 9, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Marketing Team', 'phone', '+60 3-2345 6789', 'role', 'Event Coordinator')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 10, 'data', jsonb_build_object('deadline', '', 'askPax', false, 'askDietary', true)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 11, 'data', jsonb_build_object('message', 'We look forward to launching with you.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;

-- ============================================================================
-- workshop-seminar (Tier 3 / Phase 4)
-- ============================================================================

insert into public.templates (id, name, category, price_myr, is_active, type, theme, sections)
values (
  'workshop-seminar',
  'Workshop & Seminar',
  'corporate',
  6900,
  true,
  'workshop_seminar',
  jsonb_build_object(
    'palette', 'minimal_ink',
    'fonts', jsonb_build_object('display', '--font-cormorant', 'body', '--font-jakarta'),
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', '#fafafa')
  ),
  jsonb_build_array(
    jsonb_build_object('type', 'landing',    'variant', 'minimalist',    'enabled', true, 'order', 0, 'data', jsonb_build_object('headline', 'AI for Founders', 'subhead', 'A practical workshop', 'tagline', 'Limited seats', 'coverPhotoUrl', '', 'eventDate', '')),
    jsonb_build_object('type', 'welcome',    'variant', 'card_centered', 'enabled', true, 'order', 1, 'data', jsonb_build_object('greeting', 'Welcome', 'body', 'A hands-on session for practitioners. Come ready to build.')),
    jsonb_build_object('type', 'event_info', 'variant', 'card_stack',    'enabled', true, 'order', 2, 'data', jsonb_build_object('eventName', 'AI for Founders Workshop', 'date', '', 'time', '09:00', 'venue', 'Co-Working Hub', 'address', '')),
    jsonb_build_object('type', 'program',    'variant', 'timeline',      'enabled', true, 'order', 3, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('time', '9:00 AM',  'event', 'Registration & coffee'),
        jsonb_build_object('time', '9:30 AM',  'event', 'Opening keynote'),
        jsonb_build_object('time', '10:30 AM', 'event', 'Hands-on lab'),
        jsonb_build_object('time', '12:30 PM', 'event', 'Lunch'),
        jsonb_build_object('time', '1:30 PM',  'event', 'Case studies'),
        jsonb_build_object('time', '3:30 PM',  'event', 'Q&A and closing')
    ))),
    jsonb_build_object('type', 'corporate_speakers', 'variant', 'grid',  'enabled', true, 'order', 4, 'data', jsonb_build_object('speakers', jsonb_build_array(
        jsonb_build_object('name', 'Speaker One', 'role', 'Lead Facilitator', 'bio', '', 'photoUrl', '')
    ))),
    jsonb_build_object('type', 'countdown',  'variant', 'digital',       'enabled', true, 'order', 5, 'data', jsonb_build_object('label', 'Starts In', 'targetDate', '')),
    jsonb_build_object('type', 'calendar',   'variant', 'buttons',       'enabled', true, 'order', 6, 'data', jsonb_build_object('titleOverride', 'Add to Calendar', 'eventName', 'AI for Founders Workshop', 'startsAt', '')),
    jsonb_build_object('type', 'map',        'variant', 'button_row',    'enabled', true, 'order', 7, 'data', jsonb_build_object('address', '', 'wazeUrl', '', 'gmapsUrl', '', 'grabUrl', '')),
    jsonb_build_object('type', 'contact',    'variant', 'list',          'enabled', true, 'order', 8, 'data', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('name', 'Workshop Team', 'phone', '+60 3-2345 6789', 'role', '')
    ))),
    jsonb_build_object('type', 'rsvp',       'variant', 'classic',       'enabled', true, 'order', 9, 'data', jsonb_build_object('deadline', '', 'askPax', false, 'askDietary', true)),
    jsonb_build_object('type', 'thank_you',  'variant', 'card',          'enabled', true, 'order', 10, 'data', jsonb_build_object('message', 'See you at the workshop.'))
  )
)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, price_myr = excluded.price_myr,
  is_active = excluded.is_active, type = excluded.type,
  theme = excluded.theme, sections = excluded.sections;
