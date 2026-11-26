# TEMPLATE_TAXONOMY.md — `kamy-jemput/docs/`

> The two catalogues that drive everything: **Event Types** (the kinds of cards we sell, tailored for Malaysia) and **Section Components** (the reusable parts each template is built from). A template is a `(type, theme, sections)` preset; this file defines what `type` and `sections` can be.

> The original section list was sketched by the user in `kamy-jemput.excalidraw`. This file structures that list, extends it with the Malaysian event types beyond weddings, and maps which Sections belong to which event types.

---

## 1. Why a Malaysia-specific taxonomy

Generic Western invitation-card platforms miss most of what Malaysians actually invite people to. Weddings here split clearly along Malay / Chinese / Indian / mixed religious lines; the Open House culture around Hari Raya, CNY, Deepavali, and Christmas is a recurring annual revenue stream the generic platforms have no template for; and there are uniquely Malaysian Muslim and Chinese family rituals (Aqiqah, Cukur Jambul, Full Moon, Khatam Quran) that have no equivalent in Anglo template catalogues.

Designing the taxonomy around the local market does two things:
- Customers feel the product was built for them ("they know what Khenduri Doa Selamat is").
- The Section catalogue captures the right primitives — e.g. `SectionCatering` (caterer promotion) is a real Malay-wedding need; `SectionWishlist` covers both Western gift registries AND Muslim DuitRaya / Chinese ang pao QR.

The taxonomy below is **tiered by expected demand and build priority**, not by cultural importance. Tier 1 ships first.

---

## 2. Event Type catalogue

### Tier 1 — MVP (Phase 1–2)

The high-volume types. Build these first; they cover the majority of expected orders.

| Type ID | Display name (EN / MS) | Typical context | RSVP? |
|---|---|---|---|
| `wedding_malay` | Malay Wedding / Majlis Perkahwinan Melayu | Akad nikah + reception; bride/groom + parents named; often features caterers and religious quote | Yes |
| `wedding_chinese` | Chinese Wedding / 中式婚禮 | Tea ceremony + banquet; double-囍, red/gold palette, lunar date | Yes |
| `wedding_indian` | Indian Wedding / Perkahwinan India | Multi-day; Hindu (mehndi, sangeet, ceremony) or mixed; rich colours | Yes |
| `wedding_general` | General / Christian / Mixed Wedding | Church or non-religious; English-first; minimalist or classic | Yes |
| `open_house_raya` | Hari Raya Open House / Rumah Terbuka Raya | First / second week of Syawal; family + colleagues; no formal RSVP, optional headcount | Optional |
| `open_house_cny` | Chinese New Year Open House / 新春開門 | First 15 days of lunar new year; reunion + extended family | Optional |
| `open_house_deepavali` | Deepavali Open House | One-day open house; Indian Malaysian families | Optional |
| `open_house_christmas` | Christmas Open House | Christmas day or weekend; mixed faith common | Optional |
| `birthday_kids` | Kids Birthday / Hari Jadi Kanak-kanak | Themed (animals, princess, dinosaurs); under-12 | Yes |
| `birthday_milestone` | Milestone Birthday | 21st, 30th, 50th, 60th, 70th, 80th — often a dinner or party | Yes |

### Tier 2 — Ritual & milestone (Phase 3)

Recurring, lower volume per family but high return: most Malaysian families will need these every few years.

| Type ID | Display name (EN / MS) | Typical context | RSVP? |
|---|---|---|---|
| `engagement_malay` | Malay Engagement / Pertunangan / Merisik | Sometimes paired with Hantaran (gift exchange) ceremony | Yes |
| `engagement_general` | General Engagement | Mixed / Chinese / Indian engagement | Yes |
| `aqiqah` | Aqiqah | Muslim newborn celebration; meal + prayer | Optional |
| `cukur_jambul` | Cukur Jambul | First-haircut ceremony, often with Aqiqah | Optional |
| `full_moon` | Full Moon Celebration / 滿月 | Chinese newborn at 30 days; family gathering | Optional |
| `khatam_quran` | Khatam Quran | Child's Quran completion ceremony | Optional |
| `anniversary` | Wedding Anniversary | Often milestone (25th silver, 50th gold) | Yes |
| `khenduri` | Khenduri / Kenduri Doa Selamat | General Malay religious feast (housewarming, thanksgiving) | Optional |
| `baby_shower` | Baby Shower | Pre-birth gathering, mixed culture | Yes |

### Tier 3 — Event-driven & corporate (Phase 4)

Lower per-customer frequency but higher ticket value or B2B potential.

| Type ID | Display name (EN / MS) | Typical context | RSVP? |
|---|---|---|---|
| `graduation` | Graduation / Konvokesyen | Family + close friends celebration | Yes |
| `gender_reveal` | Gender Reveal | Pre-birth event, photo-heavy | Optional |
| `corporate_dinner` | Corporate Annual Dinner | End-of-year, themed | Yes |
| `corporate_launch` | Product / Office Launch | Press + clients invited | Yes |
| `workshop_seminar` | Workshop / Seminar | Paid or free, includes agenda | Yes |
| `religious_gathering` | Religious Gathering | Maulidur Rasul, tahlil, prayer night | Optional |

### Tier 4 — Sensitive (separate consideration)

| Type ID | Display name (EN / MS) | Notes |
|---|---|---|
| `memorial` | Memorial / Tahlil Arwah | Sombre design system, no countdown, no party-coded sections. Probably build with a small focus group; not in the initial roadmap. |

---

## 3. Section Component catalogue

Each Section is a reusable building block. The user's original list (`kamy-jemput.excalidraw`) is preserved verbatim — this section structures and extends it.

### 3.1 — Universal Sections (apply to ~all event types)

These are the "every card has one of these" Sections.

| `SectionType` | What it is | Notes |
|---|---|---|
| `landing` | Cover / opening screen; host name(s), event type tag, "Open Invitation" tap-through | First impression; large hero image or pattern |
| `event_info` | What + when + where (one or many events); the structured details block | The core data Section |
| `map` | Address + Waze + Google Maps + Grab deep links + optional pin embed | Variants: button row, embedded preview, interactive |
| `contact` | Phone numbers of bridal party / hosts / siblings | Click-to-call on mobile |
| `rsvp` | The RSVP form (attending, pax, dietary, message) | Toggleable for types where RSVP is optional |
| `thank_you` | Post-RSVP message; sometimes a sticker / animation | Default: simple confirmation card |

### 3.2 — Cross-cutting (theme-level, not Sections)

These are NOT Sections — they live in the template's `Theme` and apply globally.

| Theme axis | What it controls |
|---|---|
| `palette` | Colour scheme (`plum_gold`, `amber_rose`, `red_gold`, `sage_ivory`, customer-tunable in Phase 2) |
| `fonts` | Display + body + optional script font set |
| `animation` | Page reveal style (`none`, `particles`, `fade`, `ken_burns`) |
| `background` | Solid / pattern / image |

The user's listed "Background", "Font", "Animation" sit here, not in the Section list. Design rationale: they're cross-cutting visual settings; treating them as Sections would force every Section to opt-in to themed rendering rather than receive theme via context.

### 3.3 — Common-Optional Sections (cross-type)

Available across most event types; customer toggles on/off.

| `SectionType` | What it is | Used by (typical) |
|---|---|---|
| `welcome` | Greeting / intro text card (Bismillah, "Welcome to our day", etc.) | All — religious framing for Malay/Indian |
| `quote` | Religious verse, poem, or sentimental quote | Wedding, engagement, aqiqah, khatam |
| `countdown` | Days/hours till event start | Wedding, milestone birthday, engagement |
| `calendar` | "Add to calendar" — GCal / iCal / Outlook deep links + visual calendar block | All time-bound events |
| `guestbook` | Attendees' wishes wall (customer's user-facing "attendees message" component) | Wedding, anniversary, milestone birthday |
| `wishlist` | Gift registry, DuitRaya QR, ang pao QR, bank transfer details | Wedding, anniversary, aqiqah, baby_shower |
| `program` | Itinerary / agenda (multi-row time + event) | Wedding, corporate, workshop |

### 3.4 — Event-type-specific Sections

Only meaningful for certain types; the customisation form hides Sections whose `appliesTo` excludes the active template type.

| `SectionType` | What it is | `appliesTo` |
|---|---|---|
| `gallery` | Photo collage blocks — customer picks 1/2/3-photo layout per block; **repeatable** (can be added multiple times per card so collages interleave between chapters). Shipped form of the planned `couple_picture`; generalised, so `appliesTo` is all | all |
| `love_story` | Chaptered love-story moments with photos (shipped form of the planned `couple_history`) — see `docs/DESIGN_SAKURA_STORY.md` | wedding_*, engagement_*, anniversary |
| `catering` | Caterer line-up with menu, photos, phone (promotes vendors) | wedding_malay (primary), khenduri |
| `child_info` | Baby's name + DOB + parents (Aqiqah / Full Moon / Cukur Jambul) | aqiqah, cukur_jambul, full_moon |
| `agenda_multi_day` | Multi-day schedule (mehndi night, sangeet, ceremony) | wedding_indian, wedding_chinese (if multi-day) |
| `corporate_speakers` | Speaker line-up with bios + photos | corporate_launch, workshop_seminar |
| `dress_code` | Theme / dress code card (often a colour swatch) | All party-style events |

### 3.5 — Likely future Sections (not in MVP)

| `SectionType` | Why not yet |
|---|---|
| `live_stream` | Niche; YouTube/Zoom link, post-pandemic relevance dropped |
| `seating_plan` | Heavy data, needs editor UI; defer |
| `survey_followup` | "How was it?" post-event poll; future |
| `live_photo_feed` | Real-time guest uploads; needs storage + moderation |

---

## 4. Section-by-Type matrix (preset templates)

This is what a **default preset** looks like per type. The customer can toggle Sections on/off and reorder during customisation (Phase 2+).

Legend: `Y` = default ON, `o` = available but default OFF, `-` = hidden (does not apply to this type).

| Section | wedding_malay | wedding_chinese | wedding_indian | wedding_general | open_house_raya | open_house_cny | birthday_kids | birthday_milestone | engagement_malay | aqiqah | cukur_jambul | anniversary | khenduri | corporate_dinner |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| landing | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| welcome | Y | Y | Y | o | Y | Y | o | o | Y | Y | Y | o | Y | o |
| quote | Y | o | Y | o | Y | o | - | - | Y | Y | o | Y | Y | - |
| gallery (né couple_picture) | Y | Y | Y | Y | - | - | - | - | Y | - | - | Y | - | - |
| love_story (né couple_history) | o | o | o | o | - | - | - | - | o | - | - | Y | - | - |
| child_info | - | - | - | - | - | - | - | - | - | Y | Y | - | - | - |
| event_info | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| program | Y | o | Y | Y | o | o | o | o | Y | o | o | o | o | Y |
| agenda_multi_day | - | o | Y | o | - | - | - | - | - | - | - | - | - | - |
| calendar | Y | Y | Y | Y | o | o | Y | Y | Y | Y | Y | Y | o | Y |
| map | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| countdown | Y | Y | Y | Y | o | o | Y | Y | Y | o | o | Y | o | Y |
| rsvp | Y | Y | Y | Y | o | o | Y | Y | Y | o | o | Y | o | Y |
| guestbook | o | o | o | o | o | o | o | o | o | o | o | Y | o | o |
| wishlist | o | Y | o | o | o | o | o | Y | o | Y | o | Y | o | - |
| catering | Y | - | - | - | o | - | - | - | o | o | - | - | Y | - |
| dress_code | o | o | Y | o | - | - | Y | o | Y | - | - | o | - | Y |
| corporate_speakers | - | - | - | - | - | - | - | - | - | - | - | - | - | Y |
| contact | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| thank_you | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |

**How to read this:** the column is the default Section list for that template type. `Y` rows render by default; `o` rows are added by the customer on demand (a "+ Add Section" picker in the customisation form lists the `o` rows for the active type). `-` rows are hidden.

The matrix is the **single source of truth for which Sections each preset ships with**. Update this table and the template preset seed migration together.

---

## 5. Section variants — what's reasonable per Section

Variants are alternative visual treatments for the same Section data. The customer picks one per Section (Phase 2+); Phase 1 ships one default variant per Section.

| Section | Phase 1 variant | Phase 2 additions |
|---|---|---|
| `landing` | Photo-hero | Minimalist, pattern-only, ken-burns slideshow |
| `welcome` | Card with quote | Centered, paper-scroll |
| `event_info` | Card stack | Single card, ticket stub |
| `program` | Vertical timeline | Horizontal scroll, gantt-like |
| `map` | Button row (Waze / GMaps / Grab) | Embedded preview, interactive pin |
| `calendar` | Add-to-calendar buttons | Monthly grid (selected date marked), date plaque |
| `countdown` | Digital numerals | Flip-cards, hourglass animation |
| `rsvp` | Classic form | Yes/No swipe, conversational, single-question |
| `guestbook` | Wishes wall (scroll) | Single-message rotator, polaroid wall |
| `wishlist` | Tabbed (banks / QR / registry) | Card grid, single-action ("Send DuitRaya") |
| `catering` | Vendor cards with phone | Menu-first, photo grid |
| `gallery` (né `couple_picture`) | Soft grid collage | Polaroid collage (shipped, premium), carousel, ken-burns |
| `love_story` (né `couple_history`) | Chapters (script headings + tilted photos) | Horizontal scroll, vertical timeline |
| `child_info` | Centered card | Photo-bg card |
| `thank_you` | Confirmation card | Animated sticker, full-screen overlay |

This is **directional, not committed.** Add a variant only when there's evidence customers want it (support requests, custom orders); don't pre-build the long tail.

---

## 6. Where this taxonomy lives in code

- **TypeScript types:** `lib/types.ts` exports `SectionType`, `TemplateType`, and the `SectionDataFor<T>` discriminated union.
- **Registry:** `lib/sections/registry.ts` is the runtime map of `SectionType → SectionModule`.
- **Template presets:** `supabase/migrations/0XX_seed_templates_v2.sql` seeds the `templates` table with the matrix in §4. Each row's `sections` JSONB is the default preset.
- **Customisation form Section picker:** uses `module.appliesTo` to filter the "+ Add Section" list for the active template type.

When this file changes (a new event type, a new Section), both the migration seed and the registry need updating. The change list is small and explicit; the matrix in §4 is the working document.

---

## 7. What's deliberately NOT in the taxonomy

- **Niche religious sub-divisions** (Shia/Sunni, Sikh/Hindu, Mahayana/Theravada). The Section data fields are religion-agnostic; theme + quote text handles the variation.
- **Per-state variations** (Sabah / Sarawak indigenous weddings, peninsula state royalty protocols). If demand surfaces, add a Section variant or a sub-type then.
- **Wedding sub-events as separate template types** (akad nikah vs reception). One template, multiple Sections in the program.

If a Section appears below the matrix that doesn't fit anywhere → that's a candidate for a true bespoke custom order, not a new catalogue Section.
