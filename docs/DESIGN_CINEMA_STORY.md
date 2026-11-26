# Cinema Story — wedding-as-a-film-premiere template

Agent-agnostic reference for the **Cinema Story** template
(`templates.id = 'cinema-story'`) and the design thinking behind it. Read
together with `docs/DESIGN_SAKURA_STORY.md` (the storytelling-template
playbook this follows), `docs/DESIGN_CELESTIAL_STORY.md` (the previous
storytelling template), `docs/TEMPLATE_GAYA.md` (Gaya presets) and
`docs/TEMPLATE_TAXONOMY.md` (Section catalogue).

Code touched by this work:

- `components/sections/landing/cinema_hero.tsx` — `premiere_gate` landing variant
- `components/sections/landing/index.tsx` — variant registration + meta/tier
- `components/sections/love_story/index.tsx` — `film_episodes` variant
- `components/sections/countdown/index.tsx` — `film_leader` variant
- `lib/themes/presets.ts` — `editorial_cinema` Gaya preset
- `app/layout.tsx` — `--font-bodoni` (Bodoni Moda) registration
- `supabase/migrations/015_seed_cinema_story_template.sql` — template seed (data only)
- `scripts/seed-cinema-story.mjs` — REST upsert mirror of 015 (migration
  history is drifted; never blind `supabase db push`)
- `app/(public)/templates/page.tsx` + `app/(public)/templates/[id]/page.tsx` —
  static catalogue entries (both lists are hardcoded; see SAKURA doc §4.5)

One new font (Bodoni Moda, registered via `next/font`), no schema changes, no
new SectionTypes.

---

## 1. The research: jestudio's episode-one demo

Analysed from `https://jestudio.my/demos/episode-one/`. The demo frames the
wedding as a **film production**: hero credits ("A Wedding Production · 2027
Original Wedding Series", "Directed by · Fate", "Produced by · Love"), the
page divided into **Episode 01–06** (invitation → love story chapters →
countdown/program → venue → gallery → RSVP), a letterboxed opening sequence
(`lbSlideDown`/`lbSlideUp` black bars + `titleReveal` letter-spacing shift),
ken-burns hero photo, a film-strip carousel built from
`repeating-linear-gradient` sprockets, and SVG noise grain.

Palette (from its `style.css`): off-whites `#FAFAF9`/`#F5F4F2`, near-black
`#0D0D0D`/`#1A1A1A`, grays `#888880`/`#C8C7C3`, gold `#B8A070`. Fonts: DM Sans
body + **Bodoni Moda** display (plus Noto Serif KR for the demo's Korean
text). The editorial off-white-and-ink look with a single muted gold is what
sells the "premiere" feel.

## 2. The concept: the invitation is a screening

The scroll is the film. The guest *plays* the invitation, the sections run as
episodes, and the wedding date is the premiere:

| Reel | Sections | Story beat |
|---|---|---|
| Title card | `landing` (`premiere_gate`) | A black screen with a pulsing ▶ — the guest taps to start the screening |
| Episode 01 | `welcome`, `quote` | "A Joyful Invitation" — the families invite you |
| Episode 02 | `love_story` (`film_episodes`), `gallery` (filmstrip carousel) | The couple's story as numbered episodes; photos as behind-the-scenes stills |
| Episode 03 | `event_info`, `countdown` (`film_leader`), `calendar` (`month_grid`), `program`, `dress_code`, `map`, `contact` | The premiere details, counted down on a film leader |
| Episode 04 | `rsvp` (`romance_envelope`, `inheritTheme: true`), `guestbook` | Reserve your seat; "The Reviews" — wishes as critics' quotes |
| Post-credits | `thank_you` | "To be continued…" |

Continuity rule: the hero is the only dark surface (a cinema screen is black
by definition); from `welcome` on, the card is the **film programme** — the
off-white/ink/gold editorial page. The film language recurs instead of the
background: sprocket strips in the `film_episodes` photo frames, the gallery's
existing `filmstrip` carousel design, the leader crosshair in the countdown,
and credit-style tracked uppercase micro-labels everywhere.

## 3. The `editorial_cinema` Gaya

`lib/themes/presets.ts`. Palette straight from §1: bg `#fafaf9`, text
`#1a1a1a`, accent `#0d0d0d` (ink headings), gold `#b8a070` (hairlines, credit
lines), muted `#888880`, card `#f5f4f2`, divider `✳`, opening
`A Wedding Production` (the hero reads `colors.opening` as its production
tag). Fonts: **Bodoni Moda** display *and* script slots (the cinema look
wants didone italics, not a handwriting script), Jakarta body. Bodoni Moda is
registered as `--font-bodoni` in `app/layout.tsx` per TEMPLATE_GAYA.md §4.

Being a Gaya, it is selectable on **any** template; `sectionVariants`
suggests `premiere_gate` / `film_episodes` / `film_leader` / `designer` /
`month_grid` / `romance_envelope`. Conversely the three new variants read
their accents (gold, fonts, divider, opening) from the theme, so other
palettes recolour the credits — only the screen/frame blacks are constant
(see §4).

## 4. The three new variants

### 4.1 `premiere_gate` (landing, premium)

Follows the sakura_depth/celestial_gate recipe — tap-to-open entrance →
staggered open choreography (`opened` state attaches the animation classes) →
pointer/scroll parallax (screen drifts *with* the pointer, title block
*against* it) → reduced-motion kill-switches (`data-cn-reduced`). What's new:

- **The entrance is a title card.** Black screen between two film-strip
  sprocket bands, production tag (`colors.opening`), the film title
  (tagline) in tracked Bodoni caps, and a pulsing ▶ button with the hint
  "Tekan untuk mula tayangan · Tap to play".
- **Projector warm-up.** On open the whole screen layer runs `cn-flicker`
  (uneven `steps()` brightness) before settling — the projector starting.
- **Title reveal.** The names land with jestudio's `titleReveal` move:
  letter-spacing animates 0.4em → 0.12em while the blur fades (`cn-title`).
  "STARRING" sits above; the ampersand is an italic gold line between the
  two name rows (`splitHeadline`).
- **Credits parsing.** The subhead ("Directed by Fate · Produced by Love")
  is split on `·`/`•`/`|` and each "<role> by <name>" renders as a stacked
  credit column (role in tracked caps, name in gold italic). Lines that
  don't parse render as a plain italic credit line — nothing breaks.
- **Premiere plaque.** "PREMIERE" + `DD.MM.YYYY` in lining Bodoni numerals +
  an expanding gold rule + the long weekday label.
- **Screen blacks are constants** (`#0b0a09` etc.), not theme colours — a
  black screen is the one palette-neutral surface, mirroring how the RSVP
  variants self-theme. Gold/fonts/tag stay theme-driven. No photo ⇒ a
  projector-spotlight radial wash, so the template previews well
  unconfigured. Ken-burns + grain + seeded dust motes (constant array —
  never `Math.random()` in render; Sections are SSR'd and random initial
  render breaks hydration).
- **The letterbox is the seam.** The film-strip bands frame the hero top and
  bottom, so the cut to the off-white programme page below reads as the
  frame edge — no gradient seam needed.

### 4.2 `film_episodes` (love_story, premium)

The chapters variant re-imagined as a series: each `StoryMoment` gets an
episode slate (big lining number + "EPISODE 01" tag + a gold rule that fades
out), alternating left/right alignment so the scroll reads like cut scenes.
Photos render as **sprocketed film frames** — film-black surround, vertical
sprocket strips, a SCENE/TAKE caption row. The signature renders under a
"TO BE CONTINUED" tag. Scroll-reveals via the shared `Reveal` helper;
reduced motion handled with a `prefers-reduced-motion` CSS block.

### 4.3 `film_leader` (countdown)

The old-school film leader: a crosshair dial (hairlines + inner ring) with a
conic-gradient wedge sweeping like the leader's clock arm, the day count in
the centre, then hours/minutes/seconds as three film frames with sprocket
dots along their edges. Pure CSS, all colours from the theme. Uses the
existing `useCountdown` hook; the sweep stops (and hides) under reduced
motion.

## 5. Template seed

`015_seed_cinema_story_template.sql` upserts the `cinema-story` row (price
RM149 — priced above Celestial Story as the new flagship). Copy keeps
jestudio's episodic voice ("Began with a moment, became a forever", episode
labels "Where It All Began" / "Falling Together" / "Forever Starts Now") with
bilingual EN/MS framing ("Tayangan Perdana Dalam", "Terima kasih kerana
menjadi sebahagian daripada episod pertama kami"). The gallery leads with the
existing `filmstrip` carousel design — it was built for exactly this
template's language. Both hardcoded catalogue lists were updated
(`/templates` `ALL_TEMPLATES` + `/templates/[id]` `TEMPLATE_META`) — a new
template silently never appears without this (SAKURA doc §4.5).

Migration-history drift still applies: apply the seed via the SQL editor or
`node scripts/seed-cinema-story.mjs`, never a blind `supabase db push`.

## 6. Deliberately left out (future work)

- **Background music** — the inspiration demo has a spinning-disc music
  button; same audio-pipeline gap as the Sakura doc §3.
- **A true letterbox open transition** — jestudio slides black bars in/out
  over the whole page. Our entrance fades instead; animated bars that
  retract into the hero's film-strip bands on open would deepen the ritual.
- **"Now Showing" ticket RSVP variant** — the RSVP currently reuses
  `romance_envelope` with `inheritTheme`. A cinema-ticket RSVP (stub with a
  perforated edge, seat/row labels) would close the loop, like the
  star-field guestbook idea in the Celestial doc.
- **End-credits guestbook** — wishes scrolling upward like closing credits
  instead of the `wishes_wall` marquee.
