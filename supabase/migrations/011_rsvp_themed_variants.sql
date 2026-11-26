-- Switch each template's RSVP section from the legacy "classic" variant to
-- the new themed variant that fits the occasion. Idempotent — re-running is
-- safe (jsonb_set replaces in place).
--
-- Variant mapping:
--   walimah          → Malay/Islamic weddings, engagement, aqiqah
--   romance_envelope → general wedding, anniversary, minimalist wedding
--   double_happiness → Chinese weddings
--   confetti_pop     → birthday, gender-reveal, graduation
--   boardroom_badge  → corporate, workshop, seminar
--
-- open-house-raya has no RSVP section by design (open-house presets).

create or replace function pg_temp.set_rsvp_variant(p_template_id text, p_variant text)
returns void as $$
declare
  rec record;
  i int;
  new_sections jsonb;
  section jsonb;
begin
  for rec in select id, sections from public.templates where id = p_template_id loop
    if rec.sections is null then
      continue;
    end if;
    new_sections := '[]'::jsonb;
    for i in 0 .. jsonb_array_length(rec.sections) - 1 loop
      section := rec.sections -> i;
      if section ->> 'type' = 'rsvp' then
        section := jsonb_set(section, '{variant}', to_jsonb(p_variant));
      end if;
      new_sections := new_sections || section;
    end loop;
    update public.templates set sections = new_sections where id = rec.id;
  end loop;
end;
$$ language plpgsql;

select pg_temp.set_rsvp_variant('malay-wedding',     'walimah');
select pg_temp.set_rsvp_variant('malay-wedding-v2',  'walimah');
select pg_temp.set_rsvp_variant('engagement-malay',  'walimah');
select pg_temp.set_rsvp_variant('aqiqah',            'walimah');

select pg_temp.set_rsvp_variant('general-wedding',   'romance_envelope');
select pg_temp.set_rsvp_variant('anniversary',       'romance_envelope');
select pg_temp.set_rsvp_variant('minimalist',        'romance_envelope');

select pg_temp.set_rsvp_variant('chinese-wedding',    'double_happiness');
select pg_temp.set_rsvp_variant('chinese-wedding-v2', 'double_happiness');

select pg_temp.set_rsvp_variant('birthday',      'confetti_pop');
select pg_temp.set_rsvp_variant('gender-reveal', 'confetti_pop');
select pg_temp.set_rsvp_variant('graduation',    'confetti_pop');

select pg_temp.set_rsvp_variant('corporate',         'boardroom_badge');
select pg_temp.set_rsvp_variant('corporate-dinner',  'boardroom_badge');
select pg_temp.set_rsvp_variant('corporate-launch',  'boardroom_badge');
select pg_temp.set_rsvp_variant('workshop-seminar',  'boardroom_badge');
