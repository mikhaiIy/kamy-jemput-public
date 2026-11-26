# Sakura Story — jestudio-inspired storytelling template

Agent-agnostic reference for the **Sakura Story** template (`templates.id =
'sakura-story'`) and the design research behind it. Read together with
`docs/TEMPLATE_GAYA.md` (Gaya presets) and `docs/TEMPLATE_TAXONOMY.md`
(Section catalogue).

Code touched by this work:

- `components/sections/landing/index.tsx` — `sakura_depth` landing variant
- `components/sections/gallery/index.tsx` — new `gallery` Section (photo collages)
- `components/sections/love_story/index.tsx` — new `love_story` Section (chapters)
- `components/sections/calendar/index.tsx` — `month_grid` calendar variant
- `components/sections/_shared.tsx` — `Reveal` scroll-reveal helper
- `components/sections/_image_upload.tsx` — shared editor upload field
- `lib/themes/presets.ts` — `sakura_blush` Gaya preset
- `lib/types.ts` — `gallery` / `love_story` SectionTypes + data shapes
- `app/layout.tsx` — `--font-dancing` (Dancing Script)
- `supabase/migrations/013_seed_sakura_story_template.sql` — template seed (data only)

---

## 1. Research: why jestudio.my invitations feel special

Analysed from `https://jestudio.my/demos/cherry-blossom/` (plain HTML +
`style.css` + `script.js`, ~1,600 lines total — no frameworks, no GSAP/AOS).
The findings, in order of impact:

### 1.1 The invitation is a *ritual*, not a page

A full-screen **entrance overlay** ("Tap anywhere to open · 点击任意处开启")
with a floating polaroid of the couple blocks the content until the guest taps.
Opening then fires a choreographed sequence: overlay fades, background music
starts, six hero PNG layers fade in staggered 150 ms apart. The guest *opens*
the invitation the way they'd open an envelope.

### 1.2 Chapters tell a story

The demo is one long scroll separated into 4 chapters, each with its own
header pattern (big script heading + tiny uppercase tag, e.g. "Save the date
· - INFORMATION"):

| # | Chapter | Components inside |
|---|---|---|
| 0 | Entrance | polaroid + tap hint + petals |
| 1 | Hero / Invitation | layered hero art, names + parents' invite, photo, playful quote, photo, WhatsApp contact buttons |
| 2 | Love Story | script header, framed photo w/ offset accent border, 2-up photo grid, story copy ("He saw her. She saw him."), tilted polaroid, sign-off |
| 3 | Save the Date | real month-grid calendar with ♥ on the date, time + live countdown, venue photo, stylised map + GMaps/Waze buttons, program timeline + dress-code cards |
| 4 | RSVP / Closing | full-bleed photo, RSVP CTA (Google Form), closing quotes, script "Thanks" |

The chapter order mirrors how a host would *tell* it: who → why you →
our story → the details → please come.

### 1.3 Photos are scattered, varied, and personal

Eight photos appear across the page in **varied collage forms**: full-bleed,
inset with padding, 2-up grid, framed with an offset accent border, tilted
polaroid with washi tape. Variety is the point — every scroll reveals
the couple again in a different framing.

### 1.4 Cheap, constant motion

All animation is tiny and dependency-free:

- `.reveal` → IntersectionObserver adds `.visible` (fade + 20 px rise, 0.6 s)
- falling petals: small DOM nodes with `fall` keyframes, spawned on a timer
- floating polaroid (`polFloat`), pulsing tap-hint, twinkling `✦` sparkles,
  drifting 🌸, spinning music disc, live countdown
- staggered `layerFadeIn` of the hero PNG stack after opening

### 1.5 Tone

Casual, bilingual, romantic-funny copy ("Two weirdos who found their
favourite weirdo. Honestly? Goals."). Palette: white page, blush `#e8637f`,
dusty blue `#7ab3c8`, antique gold `rgba(200,160,60)`. Fonts: Dancing Script
(script), Cormorant Garamond (names), Lato + Noto Serif SC (body).

### 1.6 The other jestudio demos (design-language survey)

| Demo | Language |
|---|---|
| `gilded-grace` | Champagne gold `#9A7D58` + cream `#EDE5D8`; Cormorant / EB Garamond / Great Vibes / Pinyon Script; full-bleed hero photo + vignette + monogram + botanical SVG; ornament rows ✦; canvas **scratch-to-reveal** date card |
| `simple-luxury` | Minimalist editorial poster: DM Sans ultra-light wide-tracked + Cormorant italic; off-white/ink/red `#C0272D`; giant "ALEX & AGNES" type with the photo slideshow overlapping it; calendar-style date card overlapping the photo; music-player card |
| `thread-of-fate` | Chinese red 囍; lantern-curtain entrance with an "开启 Enter" button; canvas-animated hero; "Groom × Bride" name block |

These drove the `poster_luxe` (simple-luxury) and `doodle_scrapbook`
(cherry-blossom playfulness + crayon type) hero variants in §2.2.
`gilded-grace`'s scratch-to-reveal is in §3 future work.

---

## 2. How kamy-jemput adapts it

Constraints honoured:

- **No existing DB table changes.** The template is a seed row
  (`013_…sql`), exactly like 005/006/008. New Sections serialise into the
  same JSONB `templates.sections` / `cards.custom_data_draft`.
- **RSVP stays the kamy-jemput way** — in-card `rsvp` Section posting to
  `/api/rsvp/[cardId]` (variant `romance_envelope`), *not* jestudio's
  external Google Form.
- Section types are unique per card by default, **except Sections that set
  `repeatable: true`** on their module (`SectionModule.repeatable`,
  lib/sections/types.ts). `gallery` is repeatable, so collages can
  interleave between chapters jestudio-style (one after the hero, another
  after the love story, …). The editor's AddSectionPicker keeps offering a
  repeatable type after it's been added, sidebar rows number duplicates
  ("Galeri Foto 2"), and dnd-kit row ids are already `type-order` so
  duplicates sort fine. Within one instance, variety also lives in the
  per-block layout choice (1/2/3 photos).

### 2.1 Chapter mapping

| jestudio chapter | kamy-jemput Section (variant) |
|---|---|
| Entrance + hero | `landing` (`sakura_depth`) — entrance overlay built into the variant |
| Invitation text | `welcome` (`card_centered`) |
| Love story | `love_story` (`chapters`) — NEW Section |
| Photo collages | `gallery` (`polaroid_collage` / `soft_grid`) — NEW Section |
| Quote banner | `quote` (`centered`) |
| Save-the-date calendar | `calendar` (`month_grid`) — NEW variant |
| Time + countdown | `event_info` + `countdown` |
| Map + program + dress code | `map`, `program`, `dress_code` |
| WhatsApp contacts | `contact` (`list`) |
| RSVP + closing | `rsvp` (`romance_envelope`) + `thank_you` |

### 2.2 Hero designs — three landing variants (all premium)

jestudio's cherry-blossom hero is a 6-layer PNG sandwich: background → text
art → bride/groom cutouts in front, so the couple visually pops over the
words. We can't auto-cutout customer photos, so all three heroes fake the
same depth with a **bg → giant type → rectangular photo in front** sandwich,
each plane on its own pointer/scroll parallax rate (the photo always drifts
*against* the pointer; opposite motion is what sells the depth). All three
share the recipe: tap-to-open entrance → staggered open reveal (`opened`
state attaches the animation classes, so the choreography runs at open time,
not mount) → reduced-motion kill-switches. Entrances are `position: absolute`
inside the section, NOT fixed (the editor preview renders the card inline).

1. **`sakura_depth`** (`landing/index.tsx`) — cherry-blossom adaptation.
   Blurred photo clone (back, drifts with pointer) → giant script words
   "welcome / to our wedding day" (mid rate) → sharp arch-framed print in
   front with `perspective() rotateX/rotateY` tilt → falling petals.
   Polaroid entrance with washi tape.
2. **`poster_luxe`** (`landing/story_heroes.tsx`) — from jestudio
   "simple-luxury". Minimalist editorial poster: giant tracked uppercase
   Cormorant names (back plane); the 3:4 photo panel overlaps the type
   (front plane); a white calendar-style date card (`weekday / MONTH 20
   YEAR / time`) overlaps the photo corner and pops in with a spring.
   Vertical side caption, accent ✳, gallery-card entrance with pulsing dot.
3. **`doodle_scrapbook`** (`landing/story_heroes.tsx`) — the crayon
   "surprise". Fonts `--font-amatic` (tall crayon caps) + `--font-caveat`
   (marker handwriting). Paper dot-grid background; wobbling hand-drawn SVG
   doodles (hearts/stars/swirls/xoxo, seeded array) as the deepest plane;
   giant crayon names + squiggle underline (mid); washi-taped polaroid with
   a rotated "save the date!" sticker badge (front); hand-drawn dashed date
   box. Entrance is a taped paper note ("HELLO! … ✉ tap to open!").

Shared `useHeroMotion(planes)` hook in `story_heroes.tsx` drives the plane
transforms; `_hero_helpers.ts` holds `splitHeadline`/`parseDateParts` shared
across hero files (avoids a circular import).

Petals are **theme-coloured CSS shapes** (not 🌸 emoji) so any Gaya palette
works, and their positions/delays come from a constant array — **never
`Math.random()` in render**; Sections are SSR'd and random initial render
breaks hydration (negative `animation-delay`s make them mid-flight at mount).

### 2.3 `gallery` Section — per-block photo designs

Data shape (`lib/types.ts`):

```ts
gallery: { title?, intro?, blocks: GalleryBlock[] }
GalleryBlock = {
  layout: "single" | "duo" | "carousel" | "trio"(legacy → carousel),
  design?: string,   // visual treatment within the layout
  photos: string[],  // 1 / 2 / 3–8 depending on layout
  caption?,
}
```

The active variant is **`designer`**: each block picks a layout AND one of
three "photo designs" — the frame + decorative elements around the photo:

| Layout | Designs |
|---|---|
| 1 photo | `tape_polaroid` (washi-taped tilted print) · `arch_botanic` (arch frame, offset gold hairline, leaf-branch SVGs) · `doodle_frame` (crayon dashed border, heart/star doodles, Caveat caption) |
| 2 photos | `overlap_prints` (two tilted overlapping prints) · `album_pages` (album spread with centre spine + ♥ medallion) · `corner_tabs` (old-album photo corners, staggered, mono caption) |
| 3+ photos (carousel) | `postcard` (stamp + postmark, crossfade) · `filmstrip` (sprocket holes, horizontal slide, NN/NN counter) · `gallery_wall` (gold frame + mat, spotlight wash, plaque, slow ken-burns crossfade) |

Carousels show **one photo at a time and auto-advance** (3.6–4.6 s,
`useCarousel`), pause on hover/touch, expose clickable dots, and stop
auto-advancing under reduced motion. Photo count 3–8 via the custom form.

Legacy variants `soft_grid` / `polaroid_collage` still render previously
saved cards but are hidden from the editor (`hiddenVariants`). Empty photo
slots render a themed placeholder so templates preview well before uploads.

### 2.4 `love_story` Section — the narrative chapter

```ts
love_story: { title?, intro?, moments: StoryMoment[], signature? }
StoryMoment = { label, text, photoUrl? }
```

Each moment renders as "Chapter One/Two/…" tag + script heading + optional
tilted photo with jestudio's offset accent border + italic story copy.
`appliesTo` weddings/engagement/anniversary. Custom form mirrors the gallery
form (add/remove moments, upload per moment).

### 2.5 `month_grid` calendar variant

Real month grid computed from `startsAt` (Monday-first), weekend columns in
accent, a big ♥ behind the wedding date, plus the existing GCal/ICS buttons.

### 2.6 `Reveal` helper (`components/sections/_shared.tsx`)

The jestudio `.reveal` pattern as a React component. SSR-safe by
construction: server renders content **visible**; on mount, elements still
below the viewport are hidden and observed; above-the-fold elements are left
alone. No JS / reduced motion ⇒ everything stays visible. New Sections use
it; existing Sections were not retrofitted (do so opportunistically).

### 2.7 `sakura_blush` Gaya preset

`lib/themes/presets.ts`. Palette straight from the research (§1.5):
bg `#fffafb`, accent `#e8637f`, muted `#7ab3c8` (dusty blue is deliberately
the *muted* slot — jestudio uses it for all secondary text), gold `#c9a23c`,
divider `✿`. Fonts: Cormorant display, **Dancing Script** script
(`--font-dancing`, registered in `app/layout.tsx`), Jakarta body.
`sectionVariants` suggests `landing: sakura_depth`, `gallery:
polaroid_collage`, `calendar: month_grid`, `rsvp: romance_envelope` — the
first preset to suggest variants beyond RSVP (see TEMPLATE_GAYA.md §5).

---

## 3. What was deliberately left out (future work)

- **Background music** — jestudio autoplays an MP3 with a spinning disc
  toggle (simple-luxury even has a full player card). Needs an audio asset
  pipeline + autoplay-policy handling; would be a theme-level or
  Section-level feature, not landing-variant-local.
- **Scratch-to-reveal date** (gilded-grace) — canvas-based scratch card
  hiding the wedding date; would make a fun `calendar` or `countdown`
  variant.
- **Scroll-lock during entrance** — jestudio locks scrolling until opened.
  The editor preview renders the card inline (no iframe), so a body scroll
  lock would freeze the editor page; skipped.
- **WhatsApp deep links in `contact`** — jestudio renders `wa.me` buttons;
  our `contact` Section shows phone numbers. A `whatsapp_buttons` variant
  would be a small, high-value addition.
- ~~**Multiple instances of one Section type**~~ Done for `gallery` via
  `SectionModule.repeatable` (see §2.1). Other Sections stay unique; mark
  them `repeatable: true` only if a real need shows up.
- Device-orientation (gyro) parallax on mobile — iOS requires a permission
  prompt via user gesture; the entrance tap could be that gesture later.

## 4. How to build the next themed storytelling template

1. Pick the story palette + fonts → add a Gaya preset (TEMPLATE_GAYA.md §6).
2. Reuse `gallery`, `love_story`, `month_grid`, `Reveal` — they're
   theme-agnostic and read everything from `colorsFor()/fontFor()`.
3. Only build a new landing variant if the hero concept differs (the
   entrance + depth pattern in `sakura_depth` is ~all of the wow).
4. Seed a `templates` row (copy `013_…sql`, change ids/copy/variants).
5. **Gotcha — the catalogue pages are hardcoded.** `/templates`
   (`app/(public)/templates/page.tsx`, `ALL_TEMPLATES`) and
   `/templates/[id]` (`TEMPLATE_META`) render from static lists; the DB row
   only drives price/availability and the `/templates/preview/[id]` render.
   A new template **must** be added to both static lists or it silently
   never appears (and its detail page 404s). Follow-up worth doing: derive
   both pages from the `templates` table and delete the static lists.
6. **Gotcha — migration history drift.** The remote Supabase migration table
   only records 001–002; later migrations were applied out-of-band, so a
   blind `supabase db push` would replay 003+. Apply a single new seed via
   the SQL editor, or with a one-off REST upsert script
   (`scripts/seed-sakura-story.mjs` is the model).
7. No DB schema changes should ever be needed for a new template.
