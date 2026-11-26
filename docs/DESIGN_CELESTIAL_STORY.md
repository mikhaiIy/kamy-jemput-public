# Celestial Story — "written in the stars" night-sky template

Agent-agnostic reference for the **Celestial Story** template
(`templates.id = 'celestial-story'`) and the design thinking behind it. Read
together with `docs/DESIGN_SAKURA_STORY.md` (the storytelling-template
playbook this follows), `docs/TEMPLATE_GAYA.md` (Gaya presets) and
`docs/TEMPLATE_TAXONOMY.md` (Section catalogue).

Code touched by this work:

- `components/sections/landing/celestial_hero.tsx` — `celestial_gate` landing variant
- `components/sections/landing/index.tsx` — variant registration + meta/tier
- `components/sections/love_story/index.tsx` — `constellation` variant
- `components/sections/countdown/index.tsx` — `lunar_phases` variant
- `lib/themes/presets.ts` — `midnight_celestial` Gaya preset
- `supabase/migrations/014_seed_celestial_story_template.sql` — template seed (data only)
- `scripts/seed-celestial-story.mjs` — REST upsert mirror of 014 (migration
  history is drifted; never blind `supabase db push`)
- `app/(public)/templates/page.tsx` + `app/(public)/templates/[id]/page.tsx` —
  static catalogue entries (both lists are hardcoded; see SAKURA doc §4.5)

No new fonts (Cormorant + Great Vibes + Jakarta, all registered), no schema
changes, no new SectionTypes.

---

## 1. The concept: one night, dusk to dawn

Every other template and Gaya in the catalogue is light. Celestial Story is
the first **dark** card: the whole invitation is a single night sky, and the
scroll is the passage of one night. The chapter arc maps the standard wedding
Section order onto a narrative:

| Night phase | Sections | Story beat |
|---|---|---|
| Dusk | `landing` (`celestial_gate`) | The sky is sealed; the guest taps to light the stars |
| Nightfall | `welcome`, `quote` | "Di Bawah Satu Langit" — the families invite you |
| Midnight | `love_story` (`constellation`), `gallery` | The couple's story charted as a constellation; photos as stardust |
| The night itself | `event_info`, `countdown` (`lunar_phases`), `calendar` (`month_grid`), `program`, `dress_code`, `map`, `contact` | The details, counted down in moon phases |
| Before dawn | `rsvp` (`romance_envelope`, `inheritTheme: true`), `guestbook` | Answer the sky; leave a light ("Lampu-Lampu Langit") |
| First light | `thank_you` | "From dusk to dawn…" |

Continuity is the design rule: the theme background **is** the sky, every
Section renders transparently over it, the hero's bottom edge fades into
`colors.bg` with a gradient seam, and the star/orbit/glow motifs recur in the
constellation line, the lunar countdown, and the gold halo shadows. Nothing
changes background colour from the first pixel to the footer.

## 2. The `midnight_celestial` Gaya

`lib/themes/presets.ts`. Palette: bg `#101528` (midnight indigo), text
`#eae4d6` (moonlight ivory), accent `#e8c97e` (starlight gold — headings
glow), gold `#c9a96a` (ornaments/hairlines), muted `#8d97b8` (dusty
periwinkle for secondary text), card `#171f3a` (a lighter navy so panels read
as cards without breaking the sky), divider `✦`.

Being a Gaya, it is selectable on **any** template; `sectionVariants`
suggests `celestial_gate` / `constellation` / `lunar_phases` / `month_grid` /
`romance_envelope`. Conversely the three new variants are theme-driven
(everything through `colorsFor()`/`fontFor()`), so they degrade gracefully on
light palettes — `celestial_gate` on Sakura Blush is a soft dusk rather than
deep night.

Dark-palette gotcha for future presets: any Section that renders `c.text` on
`c.card` is fine, but check sections that assume a light page (the RSVP
variants self-theme light — that's why the seed sets `inheritTheme: true` on
the RSVP so it adopts the night palette).

## 3. The three new variants

### 3.1 `celestial_gate` (landing, premium)

Follows the sakura_depth recipe — tap-to-open entrance → staggered open
choreography (`opened` state attaches the animation classes) → layered
pointer/scroll parallax (sky drifts *with* the pointer, the moon *against*
it) → reduced-motion kill-switches (`data-cl-reduced`). What's new:

- **The moon is the couple.** The cover photo renders inside a circular
  "full moon" frame with a gold halo, a dashed orbit ring counter-spinning,
  and a satellite star riding the orbit. No photo ⇒ a radial moon gradient
  with the theme divider, so the template previews well unconfigured.
- **Entrance = a star locket.** The same moon at locket size, floating, with
  the hint "✦ Sentuh untuk menyalakan bintang · Tap to light the stars ✦".
- **Star field particles.** Two seeded constant arrays (`STARS_FAR` dim +
  twinkling, `STARS_NEAR` gold + glowing, on the parallax layer) — never
  `Math.random()` in render; Sections are SSR'd and random initial render
  breaks hydration.
- **Shooting stars.** Two `cl-streak` spans with long off-cycle keyframes
  (visible ~12% of the loop) that only mount after opening.
- **Constellation date row.** DD ✦ MM ✦ YYYY joined by gradient hairlines and
  glowing nodes — the date read as stars charted on a line.
- **The seam.** A 120px `linear-gradient(180deg, transparent, c.bg)` at the
  hero's bottom so the sky continues seamlessly into the next Section.

### 3.2 `constellation` (love_story, premium)

The chapters variant re-imagined as a star chart: a vertical glowing line
(gradient-faded at both ends), each `StoryMoment` a pulsing ✦ node tagged
"Star One/Two/…", photos in circular orbit frames (dashed spinning ring),
plus eight seeded ambient twinkles continuing the hero's particle language.
Scroll-reveals via the shared `Reveal` helper. Reduced motion handled with a
`@media (prefers-reduced-motion)` block (this file has no reduced-state
JS — CSS-only is enough since nothing here depends on pointer input).

### 3.3 `lunar_phases` (countdown)

A strip of CSS moons waxing new → full (a gold disc with a bg-coloured shadow
disc sliding off it — pure CSS so any palette works; the full moon pulses a
glow), then D/H/M/S as circular glowing orbs instead of square tiles. Uses
the existing `useCountdown` hook.

## 4. Template seed

`014_seed_celestial_story_template.sql` upserts the `celestial-story` row
(price RM139 — priced above Sakura Story as the flagship). Copy is
bilingual EN/MS with the night-arc voice ("Buruj Kita", "Menanti Bulan
Penuh", "Lampu-Lampu Langit"). Both hardcoded catalogue lists were updated
(`/templates` `ALL_TEMPLATES` + `/templates/[id]` `TEMPLATE_META`) — a new
template silently never appears without this (SAKURA doc §4.5).

Migration-history drift still applies: apply the seed via the SQL editor or
`node scripts/seed-celestial-story.mjs`, never a blind `supabase db push`.

## 5. Deliberately left out (future work)

- **Gyroscope parallax on phones** — the entrance tap is the user gesture
  iOS requires for the permission prompt; wire it there if ever wanted.
- **Background music** — same audio-pipeline gap as the Sakura doc §3.
- **A "stars kindle" open transition** — currently the overlay fades and the
  hero reveals; individually kindling stars (staggered per-star delays on
  open) would deepen the ritual at some CSS cost.
- **Guest wishes as stars** — the guestbook is themed as "lights in the sky"
  but renders the standard `wishes_wall` marquee. A variant that plots wishes
  as twinkling stars on a field would close the loop perfectly.
