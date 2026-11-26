-- Give every Section-v2 template a default "Gaya" (style preset) so a new card
-- starts on-brand for its event type. Sets the whole `theme` (palette + inline
-- colours + fonts + background + preset id) AND aligns the RSVP section variant
-- to the Gaya's cultural match. Mirrors lib/themes/presets.ts — keep in sync.
--
-- Idempotent: re-running replaces theme + rsvp variant in place. Updates by
-- `type`, so it covers whatever templates of each type exist.

-- Build a theme jsonb from its parts (preset id + palette fallback + colours + fonts).
create or replace function pg_temp.theme(
  p_preset text, p_palette text, p_colors jsonb, p_fonts jsonb
) returns jsonb as $$
  select jsonb_build_object(
    'palette', p_palette,
    'preset', p_preset,
    'colors', p_colors,
    'fonts', p_fonts,
    'animation', 'fade',
    'background', jsonb_build_object('kind', 'solid', 'value', p_colors->>'bg')
  );
$$ language sql immutable;

-- Apply a Gaya to all templates of a given type: set theme + RSVP variant.
create or replace function pg_temp.set_gaya(
  p_type text, p_theme jsonb, p_rsvp text
) returns void as $$
declare
  rec record;
  i int;
  new_sections jsonb;
  section jsonb;
begin
  for rec in select id, sections from public.templates where type = p_type loop
    update public.templates set theme = p_theme where id = rec.id;
    if rec.sections is not null then
      new_sections := '[]'::jsonb;
      for i in 0 .. jsonb_array_length(rec.sections) - 1 loop
        section := rec.sections -> i;
        if section ->> 'type' = 'rsvp' then
          section := jsonb_set(section, '{variant}', to_jsonb(p_rsvp));
        end if;
        new_sections := new_sections || section;
      end loop;
      update public.templates set sections = new_sections where id = rec.id;
    end if;
  end loop;
end;
$$ language plpgsql;

-- ---- Malay / Islamic → Songket Zamrud (walimah) --------------------------
do $$
declare t jsonb := pg_temp.theme('songket_emerald', 'pastel_green_gold',
  jsonb_build_object('bg','#f6f1e4','text','#22301f','accent','#1f6b4f','gold','#c9a227','muted','#7e7a5e','border','rgba(31,107,79,0.22)','card','#fffdf6','divider','✿','opening','Dengan penuh kesyukuran'),
  jsonb_build_object('display','--font-playfair','body','--font-jakarta','script','--font-great-vibes'));
begin
  perform pg_temp.set_gaya('wedding_malay',       t, 'walimah');
  perform pg_temp.set_gaya('engagement_malay',    t, 'walimah');
  perform pg_temp.set_gaya('aqiqah',              t, 'walimah');
  perform pg_temp.set_gaya('cukur_jambul',        t, 'walimah');
  perform pg_temp.set_gaya('khatam_quran',        t, 'walimah');
  perform pg_temp.set_gaya('khenduri',            t, 'walimah');
  perform pg_temp.set_gaya('religious_gathering', t, 'walimah');
end $$;

-- ---- Open house Raya → Klasik Amber --------------------------------------
do $$
declare t jsonb := pg_temp.theme('amber_classic', 'amber_rose',
  jsonb_build_object('bg','#fdf6ec','text','#3a2010','accent','#92450a','gold','#c9984a','muted','#a08878','border','rgba(201,152,74,0.4)','card','rgba(255,252,242,0.92)','divider','✦','opening','Bismillahirrahmanirrahim'),
  jsonb_build_object('display','--font-playfair','body','--font-jakarta','script','--font-great-vibes'));
begin
  perform pg_temp.set_gaya('open_house_raya', t, 'walimah');
end $$;

-- ---- Chinese → Merah Berlaka (double_happiness) --------------------------
do $$
declare t jsonb := pg_temp.theme('crimson_lacquer', 'red_gold',
  jsonb_build_object('bg','#fbf1e3','text','#4a130c','accent','#c1272d','gold','#d4af37','muted','#9c7a55','border','rgba(193,39,45,0.26)','card','#fffaf1','divider','❧','opening','囍 Our Wedding 囍'),
  jsonb_build_object('display','--font-cormorant','body','--font-jakarta','script','--font-great-vibes'));
begin
  perform pg_temp.set_gaya('wedding_chinese', t, 'double_happiness');
  perform pg_temp.set_gaya('open_house_cny',  t, 'double_happiness');
  perform pg_temp.set_gaya('full_moon',       t, 'double_happiness');
end $$;

-- ---- Indian → Marigold (marigold) ----------------------------------------
do $$
declare t jsonb := pg_temp.theme('marigold_saffron', 'amber_rose',
  jsonb_build_object('bg','#fff3df','text','#5a230a','accent','#d2691e','gold','#e0a92e','muted','#a3743f','border','rgba(210,105,30,0.3)','card','#fffaf0','divider','❉','opening','Shubh Vivah'),
  jsonb_build_object('display','--font-fraunces','body','--font-jakarta','script','--font-great-vibes'));
begin
  perform pg_temp.set_gaya('wedding_indian',        t, 'marigold');
  perform pg_temp.set_gaya('open_house_deepavali',  t, 'marigold');
end $$;

-- ---- General weddings → Blush Romance (romance_envelope) ------------------
do $$
declare t jsonb := pg_temp.theme('blush_romance', 'sage_ivory',
  jsonb_build_object('bg','#faf5f1','text','#43383a','accent','#a9646f','gold','#c4a882','muted','#9a8a86','border','rgba(169,100,111,0.24)','card','#fffdfb','divider','❦','opening','Join us as we celebrate'),
  jsonb_build_object('display','--font-cormorant','body','--font-jakarta','script','--font-great-vibes'));
begin
  perform pg_temp.set_gaya('wedding_general',    t, 'romance_envelope');
  perform pg_temp.set_gaya('engagement_general', t, 'romance_envelope');
  perform pg_temp.set_gaya('anniversary',        t, 'romance_envelope');
end $$;

-- ---- Baby shower → Taman Sage (romance_envelope) -------------------------
do $$
declare t jsonb := pg_temp.theme('garden_sage', 'pastel_green_gold',
  jsonb_build_object('bg','#f3f7ee','text','#2d3a2c','accent','#5a7a4a','gold','#c9984a','muted','#8a957a','border','#d8dcce','card','#ffffff','divider','❦','opening','Join us as we celebrate'),
  jsonb_build_object('display','--font-cormorant','body','--font-jakarta','script','--font-great-vibes'));
begin
  perform pg_temp.set_gaya('baby_shower', t, 'romance_envelope');
end $$;

-- ---- Birthdays / reveals / grad → Ceria (confetti_pop) -------------------
do $$
declare t jsonb := pg_temp.theme('confetti_bright', 'amber_rose',
  jsonb_build_object('bg','#fff7f9','text','#3a2342','accent','#ff5d8f','gold','#ffd166','muted','#9a8aa0','border','rgba(255,93,143,0.3)','card','#ffffff','divider','✦','opening','You are invited'),
  jsonb_build_object('display','--font-fraunces','body','--font-jakarta'));
begin
  perform pg_temp.set_gaya('birthday_kids',         t, 'confetti_pop');
  perform pg_temp.set_gaya('birthday_milestone',    t, 'confetti_pop');
  perform pg_temp.set_gaya('gender_reveal',         t, 'confetti_pop');
  perform pg_temp.set_gaya('graduation',            t, 'confetti_pop');
  perform pg_temp.set_gaya('open_house_christmas',  t, 'confetti_pop');
end $$;

-- ---- Corporate → Korporat (boardroom_badge) ------------------------------
do $$
declare t jsonb := pg_temp.theme('boardroom_ink', 'minimal_ink',
  jsonb_build_object('bg','#f5f6f8','text','#161a20','accent','#26303f','gold','#9aa3ad','muted','#6b7480','border','#d9dee5','card','#ffffff','divider','—','opening','You are invited'),
  jsonb_build_object('display','--font-cinzel','body','--font-jakarta'));
begin
  perform pg_temp.set_gaya('corporate_dinner',  t, 'boardroom_badge');
  perform pg_temp.set_gaya('corporate_launch',  t, 'boardroom_badge');
  perform pg_temp.set_gaya('workshop_seminar',  t, 'boardroom_badge');
end $$;

-- ---- Memorial → Minimalis (boardroom_badge) ------------------------------
do $$
declare t jsonb := pg_temp.theme('minimal_mono', 'minimal_ink',
  jsonb_build_object('bg','#fafafa','text','#1a1a1a','accent','#1a1a1a','gold','#888888','muted','#666666','border','#e0e0e0','card','#ffffff','divider','—','opening','You are invited'),
  jsonb_build_object('display','--font-fraunces','body','--font-jakarta'));
begin
  perform pg_temp.set_gaya('memorial', t, 'boardroom_badge');
end $$;
