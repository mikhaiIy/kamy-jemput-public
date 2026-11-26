# RSVP Variants — culture, colour & the self-theming model

This document is the source of truth for how the RSVP Section's themed variants
work, the colour research behind them, and the open design questions. It is
agent-agnostic: any contributor (human or LLM) should be able to extend the
variant set from this doc alone.

Code:

- `lib/sections/rsvp/signatures.ts` — the signature palettes, fonts, ambient
  kind, recommendation map, and `resolveRsvpTheme()`.
- `components/sections/rsvp/index.tsx` — the variant renderers + ambient layer.
- `components/SectionEditor.tsx` — the in-editor variant gallery (`VariantGallery`).

---

## 1. The core idea: variants are self-theming and culture-agnostic

A card carries one cross-cutting `theme` (palette + fonts) that every Section
inherits. **RSVP is the deliberate exception.** Each RSVP variant ships its own
*cultural colour signature* so it reads unmistakably as itself — a "Double
Happiness" RSVP is crimson-and-gold even when dropped into an otherwise
sage-and-ivory card.

Consequences, by design:

- **Picking a variant changes its look instantly** in the editor — no need to
  also change the whole card's palette. (Previously the variants only differed
  if you also swapped the card theme.)
- **Variants are language/culture agnostic.** Any variant is available on any
  template. The editor only *recommends* the closest match for the chosen event
  type (see §4); it never restricts.
- An **escape hatch** exists: the `inheritTheme` toggle makes a variant adopt
  the card's palette/fonts instead of its own signature, for couples who want
  the RSVP to blend into a bespoke card theme. The variant keeps its ambient
  motion and hero glyph so it still has personality.

### Why culture-agnostic matters — the mixed-family scenario

> **Brainstorm note (explicitly flagged for future work).**
> Malaysian weddings are frequently multicultural. A couple may have a Malay
> family on one side and a Chinese family on the other. Such a couple might want
> a Walimah-styled card overall but a **red-gold Chinese RSVP block** for the
> other side of the family — or even *two* RSVP sections, each themed for one
> family, each in the appropriate language.
>
> Today this is partially supported: because variants are independent of the
> card theme, you can already add a Walimah card and switch its RSVP to Double
> Happiness, or add a second RSVP Section with a different variant. What is **not
> yet designed**:
>
> - First-class "dual-RSVP" UX (two named RSVP blocks: "Pihak lelaki" /
>   "Pihak perempuan"), each with its own variant, deadline and language.
> - Per-variant language overrides (e.g. a Chinese-language variant inside a
>   Malay card without changing the card's body language).
> - Routing RSVP responses to the right family/host.
>
> These are left for a future brainstorming session. Anyone picking this up
> should start here.

---

## 2. Colour research

Colours are not decorative here — they carry meaning, and the wrong colour can
read as inauspicious. Summary of what drove each signature:

| Culture | Auspicious | Avoid | Why |
|---|---|---|---|
| **Chinese** | Red (luck, joy, prosperity, wards off evil), Gold (wealth, imperial favour). Red+gold is the peak celebratory pairing. | White & black as dominant colours (mourning). Black+white together "screams mourning". | Red wedding tradition dates to the Ming dynasty. |
| **Malay / Islamic** | Green (renewal, Islam), Gold (royalty — songket *benang emas*), red (passion). | — | Songket's gold thread signals prestige and blessing. |
| **Indian (Hindu)** | Marigold / saffron orange (the sun, brightness, auspiciousness), Red (love, purity, bravery), Turmeric yellow (blessings, purification), Green (prosperity). | — | Marigolds = "herbs of the Sun", associated with Vishnu & Lakshmi. |

### How the research maps to signatures

- **Double Happiness (Chinese)** — crimson `#c1272d` + gold `#d4af37` on **warm
  rice-paper ivory** `#fbf1e3` (never pure white), with an oxblood `#7a0f12`
  shadow tone. Hero glyph 囍.
- **Walimah (Malay/Islamic)** — songket emerald `#1f6b4f` + gold `#c9a227` on
  ivory, maroon `#7c1f3a` secondary.
- **Marigold (Indian)** — marigold/saffron `#d2691e` + turmeric gold `#e0a92e`
  + crimson `#b0182b`, with a spinning marigold-bloom motif and a *toran*
  (garland) of blossoms across the header.
- **Romance Envelope (general)** — dusty rose `#a9646f` + sage `#6f8268` +
  ivory; wax-seal envelope that opens on tap.
- **Confetti Pop (joyful)** — bright pink `#ff5d8f` + sunshine `#ffd166` + mint;
  rising confetti on accept and on success.
- **Boardroom Badge (corporate)** — ink `#26303f` + steel `#9aa3ad` + one sharp
  blue accent `#3b82f6`; restrained; renders a printable "attendee pass".

### Sources

- La Rose Florist — *Color Considerations in Chinese Weddings*: <https://larose-florist.com/en/blog/2025/10/29/color-considerations-in-chinese-weddings-red-gold-and-white-explained/>
- East Meets Dress — *Wedding Dress Color Meanings for Modern Chinese Weddings*: <https://eastmeetsdress.com/blogs/blog/wedding-dress-color-meanings-for-modern-chinese-weddings>
- Polyglottist Language Academy — *The Hidden Meanings of Colors in Chinese Culture*: <https://www.polyglottistlanguageacademy.com/language-culture-travelling-blog/2025/7/16/the-hidden-meanings-of-colors-in-chinese-culture>
- MalaysiaFact — *Traditional Malay Weddings*: <https://malaysiafact.com/traditional-malay-weddings/>
- UiTM — *The Aesthetic of Bridal Songket in Malay Traditional Wedding Attire*: <https://melaka.uitm.edu.my/ijad/images/PDF_FILE/IJAD-nasaie_zainuddin_1.pdf>
- David's Bridal — *The Meaning Behind Indian Bridal Colors*: <https://www.davidsbridal.com/content/wedding-looks/the-meaning-behind-indian-bridal-colors-what-red-yellow-green-more-symbolize>
- Bling and Bells — *Marigolds In Indian Weddings*: <https://blingandbells.com/blogs/blog/marigolds-in-indian-weddings-what-do-wedding-flowers-symbolize>

---

## 3. Ambient motion

Every variant has an ambient, CSS-only living background, gated by the `ambient`
data flag (default on; turn it off to fall back to a flat surface). Kinds:

| Variant | Ambient | Effect |
|---|---|---|
| Walimah | `motes` | slow gold dust rising (songket shimmer) |
| Double Happiness | `lanterns` | drifting warm embers / lantern glow |
| Marigold | `petals_marigold` | marigold petals falling |
| Romance | `petals_rose` | soft rose petals falling |
| Confetti Pop | `confetti` | confetti falling + burst on accept |
| Boardroom | `grid` | faint travelling grid, masked at the top |

Motion respects `prefers-reduced-motion` (particles freeze at low opacity).

---

## 4. Per-category recommendation map

Variants are never restricted by template type — every variant is selectable on
every template. `recommendedFor` only controls **ordering + a "★ Sesuai" badge**
in the editor gallery, so the natural fit floats to the top.

| Variant | Recommended for (`TemplateType`) |
|---|---|
| `walimah` | wedding_malay, engagement_malay, aqiqah, cukur_jambul, khatam_quran, khenduri, open_house_raya, religious_gathering |
| `double_happiness` | wedding_chinese, open_house_cny, full_moon |
| `marigold` | wedding_indian, open_house_deepavali |
| `romance_envelope` | wedding_general, engagement_general, anniversary, baby_shower |
| `confetti_pop` | birthday_kids, birthday_milestone, graduation, gender_reveal, open_house_christmas |
| `boardroom_badge` | corporate_dinner, corporate_launch, workshop_seminar, memorial |

---

## 5. Adding a new variant — checklist

1. Add a signature to `RSVP_SIGNATURES` in `lib/sections/rsvp/signatures.ts`
   (colours, fonts, ambient, glyph, `recommendedFor`). Add its id to
   `RsvpSignatureId`.
2. Write the renderer in `components/sections/rsvp/index.tsx` using
   `resolveRsvpTheme("<id>", theme, { inherit: data.inheritTheme })` and wrap it
   in `<RsvpStage>`.
3. Register it under `variants`, `variantLabels`, and add a `VARIANT_HINTS`
   entry. `variantMeta` (swatch + recommended) is generated automatically.
4. If it needs a new ambient kind, add it to `RsvpAmbient`, `AMBIENT_COUNTS`,
   and the `Ambient` switch.
5. Optionally add it to the dev slug switcher (`components/DevVariantSwitcher.tsx`
   + `app/api/dev/preview-variant/route.ts`).

## 6. Live preview framing

The editor preview is standardised to a **phone frame** with a transparent
screen (the card paints its own background) and a thumb-only scrollbar
(`.phone-scroll` in `app/globals.css`, applied by `components/PhonePreview.tsx`).
A **Telefon / Lebar** toggle in the preview toolbar falls back to the old
full-width preview; the choice is remembered in `localStorage`
(`kamy:preview-mode`).
