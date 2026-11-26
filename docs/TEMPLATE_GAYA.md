# Template Gaya — card-level style themes

Agent-agnostic reference for the **template-level "Gaya" picker**: a curated set
of full style themes a customer can apply to the **whole card** in one tap. It is
the card/theme-level sibling of the section-level RSVP variants
(`docs/RSVP_VARIANTS.md`). Read both together.

Code:

- `lib/themes/presets.ts` — the preset registry (`THEME_PRESETS`), `themeSwatch()`,
  `presetsForType()`, `isRecommendedPreset()`, `applyPreset()`.
- `lib/types.ts` — `Theme.colors?` (inline palette) + `Theme.preset?` (active id);
  `ThemeColors` now lives here.
- `lib/sections/theme.ts` — `colorsFor()` prefers `theme.colors` over the named
  palette.
- `components/SectionEditor.tsx` — `GayaPanel` (the picker, in the sidebar).
- `app/layout.tsx` — registers every font CSS variable referenced by presets.

### Control hierarchy

Gaya controls **invitation-card data**, not the site shell. Global site tokens,
Tailwind mappings, body/border defaults, and fixed preview/showcase interaction
styles live in `app/globals.css`; the browser viewport colour lives in
`app/layout.tsx`. They style navigation, dashboards, gallery/editor chrome, and
the phone frame and do not change when a customer picks a Gaya. See
`docs/FLOW.md` under “Theme and style controls” for the full site/card boundary.

The card-level payload is `data.theme`. Templates provide its default, the
editor saves a selected preset into it, and Section renderers consume it. Gaya
is therefore the supported curated control surface for a card; it is not a raw
site-theme or arbitrary colour/font editor.

---

## 1. How it works

A card carries one `theme` (`data.theme`). **Every Section reads it** through
`colorsFor(theme)` / `fontFor(theme, kind)`, so changing `theme` re-themes the
whole card cohesively — that's what makes Gaya "seamless".

A **Gaya preset** is a full `Theme` payload: a complete inline `ThemeColors`
palette + fonts + animation + background, plus a legacy `palette` fallback key.
Picking one calls `applyPreset(currentTheme, preset)`, which replaces
`theme.palette`, `theme.colors`, `theme.fonts`, `theme.preset`,
`theme.animation`, and `theme.background` while retaining unrelated fields on
the current `Theme`. Because presets carry **inline colours**, the system is not
limited to the 6 named `ThemePalette` keys.

`THEME_PRESETS` in `lib/themes/presets.ts` is the single curated registry.
`PRESET_LIST`, `themeSwatch()`, recommendation ordering in `presetsForType()`,
and the payload consumed by `applyPreset()` all derive from its entries; do not
maintain a second catalogue in editor code.

Backward compatible: every new field is optional. Legacy cards (named `palette`,
no `colors`/`preset`) render exactly as before. At the resolver boundary in
`lib/sections/theme.ts`, `colorsFor()` gives a complete inline `theme.colors`
precedence over `theme.palette`. Otherwise it resolves one of the six legacy
palettes (`plum_gold`, `amber_rose`, `red_gold`, `sage_ivory`, `minimal_ink`,
`pastel_green_gold`) and falls back to `plum_gold` for an unknown name.
`fontFor()` converts registered font-variable names to families with the
appropriate generic serif/sans-serif/cursive fallback; an absent optional slot
returns no override. `DEFAULT_THEME` remains the legacy/default baseline rather
than a selectable Gaya registry entry.

### Rendering the Gaya surface and motion

Every preset owns a complete visual surface: `background` (a full CSS `background`
shorthand value — solid, layered gradients, or repeating patterns) plus
`animation` (`none`, `fade`, `particles`, `ken_burns`). `applyPreset()` persists
both into `theme.background` / `theme.animation` alongside the palette and fonts,
so saved drafts and published snapshots retain the chosen surface.

The shared **Section stack** (`components/SectionInvitationCard.tsx`) paints the
card root with `theme.background.value` (falling back to `colorsFor(theme).bg`
for legacy/malformed data) and renders a decorative, pointer-transparent
`.gaya-backdrop` layer behind every enabled Section and the footer. The scoped
styles in `app/globals.css` drive the selected animation mode on that layer:
`particles` drifts ambient motes/petals, `ken_burns` slowly scales an atmospheric
glow, `fade` breathes softly, and `none` is fully static. All motion is clipped
to the invitation surface (published cards and the Live preview alike) and is
suppressed under `prefers-reduced-motion: reduce`, leaving the static preset
background intact. Gaya stays curated — customers pick a preset; they do not
supply raw CSS backgrounds or keyframes.

## 2. Culture-agnostic, recommended per type

Like the RSVP variants, **every Gaya is selectable on every template.**
`recommendedFor` only orders the editor gallery and shows a "★ Sesuai" badge for
the natural fit. This keeps the mixed-family door open (a Malay+Chinese couple
can put a Malay card on a Chinese Gaya, or vice-versa) — see
`docs/RSVP_VARIANTS.md §1`.

## 3. Preset catalogue

| id | Label | Palette feel | Recommended for |
|---|---|---|---|
| `songket_emerald` | Songket Zamrud | emerald + gold | Malay weddings, aqiqah, khatam, raya, religious |
| `royal_maroon` | Diraja Marun | royal maroon + gold (Cinzel) | Malay weddings, engagement, khenduri |
| `amber_classic` | Klasik Amber | warm amber + cream | Malay weddings, raya |
| `crimson_lacquer` | Merah Berlaka | crimson + gold | Chinese weddings, CNY, full moon |
| `imperial_gold` | Emas Diraja | ivory + ink + imperial gold (Cinzel) | Chinese weddings, full moon, CNY |
| `marigold_saffron` | Marigold | saffron + crimson + turmeric (Fraunces) | Indian weddings, Deepavali |
| `sakura_blush` | Sakura Blush | cherry-blossom pink + dusty blue + gold (Dancing Script) | general/Chinese weddings, engagement, anniversary |
| `midnight_celestial` | Malam Berbintang | midnight indigo + starlight gold — the catalogue's first **dark** palette | general/Malay weddings, engagement, anniversary |
| `editorial_cinema` | Sinema Editorial | off-white + ink + film gold (Bodoni Moda) | general/Chinese weddings, engagement, anniversary |
| `blush_romance` | Blush Romance | dusty rose + ivory | general weddings, engagement, anniversary, baby shower |
| `garden_sage` | Taman Sage | botanical sage + gold | general weddings, baby shower, anniversary |
| `confetti_bright` | Ceria | bright pink + sun + mint (Fraunces) | birthdays, gender reveal, graduation, Christmas |
| `boardroom_ink` | Korporat | ink + steel (Cinzel) | corporate dinner/launch, workshop |
| `minimal_mono` | Minimalis | quiet ivory + ink (Fraunces) | memorial, general weddings, religious, corporate |

Colour reasoning shares the cultural research in `docs/RSVP_VARIANTS.md §2`
(Chinese red/gold, Malay songket green/gold + royal maroon, Indian
marigold/saffron). Keep that the single source for sources.

## 4. Fonts

Display faces are mixed across presets for variety, all registered via
`next/font` in `app/layout.tsx`. Only the first group below is applied by Gaya
presets (via the font map in `lib/themes/presets.ts`) and only that group forms
the approved Gaya font list in D15 (`docs/DECISIONS.md`).

**Fonts Gaya presets apply** (the font map in `lib/themes/presets.ts`):

- `--font-playfair`, `--font-cormorant` — classic serifs (existing)
- `--font-great-vibes` — script accent (existing)
- `--font-cinzel` — engraved roman caps → royal / imperial / corporate-luxe
- `--font-fraunces` — characterful editorial serif → modern / romantic
- `--font-dancing` — bouncy romantic script → Sakura Blush headings
- `--font-bodoni` — high-contrast didone → Sinema Editorial film titles
  (display *and* script slots; see `docs/DESIGN_CINEMA_STORY.md`)
- body is `--font-jakarta` throughout

**Registered but not Gaya-owned** (no preset in `lib/themes/presets.ts`
applies them; they are Section-level styling, not Gaya panel font controls,
and are excluded from D15's approved Gaya font list):

- `--font-caveat` / `--font-amatic` — marker handwriting / tall crayon caps,
  used only by doodle/crayon **Section variants**
  (`components/sections/landing/story_heroes.tsx`,
  `components/sections/gallery/index.tsx`)
- `--font-geist-mono` — fixed monospace treatment inside Section code
  (boardroom RSVP, gallery, `components/CopyLinkButton.tsx`)

`app/layout.tsx` places all registered `next/font` variables on the root
`<html>` class. Any new preset font MUST be registered there and assigned to
that class before its CSS variable is referenced. If a font cannot go through
`next/font`, inject it as a component-scoped `<style>@import>` — never as a late
`@import` in `globals.css`; Tailwind's own import forces it out of order. The
legacy Chinese card's localized `Ma_Shan_Zheng` / `Noto_Serif_SC` import is the
current component-scoped exception.

## 5. Gaya × RSVP (the interaction)

Two layers cooperate so the RSVP ends up cohesive without losing its character:

1. **Variant suggestion.** Picking a Gaya sets the **matching RSVP variant**
   (e.g. a Chinese Gaya → Double Happiness RSVP) via `applyGayaSections()` — but
   only on sections the customer hasn't manually re-picked. A manual variant pick
   sets `SectionInstance.variantAuto = false`, which locks that section; auto /
   undefined stays overridable, so a later Gaya re-suggests **without clobbering**
   deliberate choices. Each preset's mapping lives in `ThemePreset.sectionVariants`.
   Most presets map RSVP only; `sakura_blush` was the first to also suggest
   `landing` / `gallery` / `calendar` variants (see `docs/DESIGN_SAKURA_STORY.md`);
   `midnight_celestial` suggests `landing` / `love_story` / `countdown` /
   `calendar` (see `docs/DESIGN_CELESTIAL_STORY.md`); `editorial_cinema`
   suggests `landing` / `love_story` / `countdown` / `gallery` / `calendar`
   (see `docs/DESIGN_CINEMA_STORY.md`).

2. **Self-theming render.** The RSVP variant then renders in its own cultural
   signature (it ignores `data.theme` unless its `inheritTheme` flag is on).
   Because the Gaya picked the *matching* variant, the RSVP comes out cohesive
   with the rest of the card automatically. `inheritTheme` ("Padankan warna kad")
   remains a separate manual override for customers who want the RSVP to literally
   adopt the card palette instead of its cultural signature.

## 6. Adding a preset

1. Add an entry to `THEME_PRESETS` in `lib/themes/presets.ts` (full `colors`,
   `fonts`, `palette` fallback, `recommendedFor`).
2. If it needs a new font, register it in `app/layout.tsx` and reference the CSS
   var.
3. That's it — the editor gallery, swatch, and recommendation ordering are all
   derived from the registry.

## 7. Editor location & data

`GayaPanel` sits at the top of the editor's left sidebar (a collapsible
"Gaya / Tema" disclosure) above the section list. Selecting a Gaya updates
`data.theme` through the same debounced save + localStorage cache as every other
edit. The standardized `PhonePreview` reflects the change live.

## 8. Intentional hard-coded boundaries

A Gaya does not replace every literal style in the product. These boundaries
are deliberate:

- global chrome tokens, the viewport colour, and fixed phone-preview/gallery
  focus, hover, scrollbar, and reduced-motion styles stay unchanged;
- the editor's no-active-preset fallback swatch is static;
- the six legacy palettes, `DEFAULT_THEME`, and each curated preset's literal
  colours/fonts are code-owned baselines;
- legacy renderers and the component-scoped Chinese card can keep their own
  typography and styling; and
- cultural RSVP variants self-theme by default and only consume the card palette
  when `inheritTheme` is enabled.

Adding raw custom controls, changing these exceptions, or turning Gaya into a
site-wide theme switcher is outside this feature's current contract (recorded
as decision D15 in `docs/DECISIONS.md`).

## 9. Open follow-ups

- Premium Gaya tiers (mirror `variantTiers`/`tier` on sections)?
- A "Custom" Gaya exposing raw palette/font controls for power users (not part
  of the current contract; requires reversing D15).
- ~~Extend `sectionVariants` beyond RSVP (landing/welcome/…) if useful.~~ Done —
  `sakura_blush` suggests landing/gallery/calendar variants.

**Done:** default Gaya per template — `supabase/migrations/012_template_gaya_defaults.sql`
(apply it to set the defaults); and Gaya-suggests-RSVP-variant via
`applyGayaSections()` gated by `SectionInstance.variantAuto`.
