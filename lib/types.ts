// ============================================================================
// Card data — legacy + Section-v2 union
// ============================================================================
//
// `CardData` is the union: a card's `custom_data` is either the old shape
// (`LegacyCardData`) or the new Section-v2 shape (`SectionCardData`). Use
// `isSectionCard(data)` to narrow.
//
// The DB column `cards.custom_data` is JSONB and accepts either. The renderer
// `<InvitationCard>` dispatches on the runtime shape.

// ---------- Localised text -------------------------------------------------
// Phase 1 stores plain strings. Schema is forward-compatible with the
// `{ primary, secondary }` shape from OPEN_QUESTIONS.md Q4 (multi-language).

export type LocalisedText = string

// ---------- Template type (event taxonomy) ---------------------------------

export type TemplateType =
  | "wedding_malay"
  | "wedding_chinese"
  | "wedding_indian"
  | "wedding_general"
  | "open_house_raya"
  | "open_house_cny"
  | "open_house_deepavali"
  | "open_house_christmas"
  | "birthday_kids"
  | "birthday_milestone"
  | "engagement_malay"
  | "engagement_general"
  | "aqiqah"
  | "cukur_jambul"
  | "full_moon"
  | "khatam_quran"
  | "anniversary"
  | "khenduri"
  | "baby_shower"
  | "graduation"
  | "gender_reveal"
  | "corporate_dinner"
  | "corporate_launch"
  | "workshop_seminar"
  | "religious_gathering"
  | "memorial"

// ---------- Theme (cross-cutting visual settings) --------------------------

export type ThemePalette =
  | "plum_gold"
  | "amber_rose"
  | "red_gold"
  | "sage_ivory"
  | "minimal_ink"
  | "pastel_green_gold"

/** Resolved palette colours. A named `ThemePalette` maps to one of these
 *  (see lib/sections/theme.ts), or a Gaya preset supplies one inline. */
export type ThemeColors = {
  bg: string
  text: string
  accent: string
  gold: string
  muted: string
  border: string
  card: string
  divider: string
  /** Suggested opening line for the welcome block. */
  opening: string
}

export type Theme = {
  palette: ThemePalette
  /** Optional inline palette supplied by a Template Gaya preset. When present it
   *  overrides the named `palette` lookup — see colorsFor(). Kept optional so
   *  legacy cards (named palette only) keep working. */
  colors?: ThemeColors
  /** Active Template Gaya preset id (lib/themes/presets.ts), if one was chosen. */
  preset?: string
  fonts: {
    display: string
    body: string
    script?: string
  }
  /** Ambient/reveal motion mode rendered by the shared Section stack.
   *  `none` is fully static; `fade` breathes the backdrop softly;
   *  `particles` drifts decorative motes/petals/stars over it;
   *  `ken_burns` slowly scales an atmospheric backdrop layer. All are
   *  suppressed under `prefers-reduced-motion: reduce`. */
  animation: "none" | "particles" | "fade" | "ken_burns"
  /** CSS-renderable surface painted behind every enabled Section by the
   *  Section stack (`components/SectionInvitationCard.tsx`). `value` is a full
   *  CSS `background` shorthand value (colour, gradient, pattern layers, or
   *  image URL) chosen by the active Gaya preset. Malformed/legacy cards fall
   *  back to `colorsFor(theme).bg`, so a missing background never blanks the
   *  invitation. Persisted by `applyPreset()` alongside the other theme fields. */
  background: {
    kind: "solid" | "pattern" | "image"
    value: string
  }
}

// ---------- Section types --------------------------------------------------

export type SectionType =
  | "landing"
  | "welcome"
  | "quote"
  | "event_info"
  | "program"
  | "map"
  | "calendar"
  | "countdown"
  | "rsvp"
  | "thank_you"
  | "contact"
  // Phase 3 — Tier-2 catalogue Sections
  | "child_info"
  | "wishlist"
  | "guestbook"
  | "dress_code"
  | "agenda_multi_day"
  // Phase 4 — Tier-3 / corporate Sections
  | "corporate_speakers"
  // Sakura Story (jestudio-inspired chapter storytelling) Sections
  | "gallery"
  | "love_story"

// ---------- Section data shapes --------------------------------------------
// Per Section, the typed shape of `SectionInstance.data`.

export type ProgramItem = { time: string; event: LocalisedText }
export type ContactItem = { name: LocalisedText; phone: string; role?: LocalisedText }

/** One photo-collage row inside the `gallery` Section. The customer picks the
 *  layout per block: 1 photo, 2 photos, or `carousel` (3+ photos shown one at
 *  a time, auto-advancing). `trio` is a legacy alias rendered as a carousel.
 *  `design` picks the visual treatment (frame + decorative elements) within
 *  the layout — see components/sections/gallery for design ids per layout. */
export type GalleryLayout = "single" | "duo" | "trio" | "carousel"
export type GalleryBlock = {
  layout: GalleryLayout
  /** Design id within the layout (e.g. "tape_polaroid"). Absent = default. */
  design?: string
  photos: string[]
  caption?: LocalisedText
}

/** One story beat inside the `love_story` Section ("How we met", …). */
export type StoryMoment = {
  label: LocalisedText
  text: LocalisedText
  photoUrl?: string
}

export type SectionDataMap = {
  landing: {
    headline: LocalisedText
    subhead?: LocalisedText
    coverPhotoUrl?: string
    tagline?: LocalisedText
    eventDate?: string
  }
  welcome: {
    greeting: LocalisedText
    body: LocalisedText
  }
  quote: {
    text: LocalisedText
    attribution?: LocalisedText
  }
  event_info: {
    eventName: LocalisedText
    date: string
    time: string
    venue: LocalisedText
    address: LocalisedText
  }
  program: {
    items: ProgramItem[]
  }
  map: {
    address?: LocalisedText
    wazeUrl?: string
    gmapsUrl?: string
    grabUrl?: string
  }
  calendar: {
    titleOverride?: LocalisedText
    eventName?: LocalisedText
    startsAt?: string
  }
  countdown: {
    label?: LocalisedText
    targetDate?: string
  }
  rsvp: {
    deadline?: string
    askPax: boolean
    askDietary: boolean
    /** Use the card's palette/fonts instead of the variant's cultural signature. */
    inheritTheme?: boolean
    /** Animated ambient background layer (lanterns/petals/motes/…). Default on. */
    ambient?: boolean
  }
  thank_you: {
    message: LocalisedText
  }
  contact: {
    items: ContactItem[]
  }
  child_info: {
    name: LocalisedText
    dob: string
    parents?: LocalisedText
    photoUrl?: string
  }
  wishlist: {
    banks: Array<{ bank: string; accNumber: string; accName: string }>
    qrCodes: Array<{ method: string; phone: string; name: string }>
    note?: LocalisedText
  }
  guestbook: {
    allowPublic: boolean
    title?: LocalisedText
    prompt?: LocalisedText
  }
  dress_code: {
    theme: LocalisedText
    note?: LocalisedText
    swatchHex?: string
  }
  agenda_multi_day: {
    days: Array<{
      label: LocalisedText
      date?: string
      items: ProgramItem[]
    }>
  }
  corporate_speakers: {
    speakers: Array<{
      name: LocalisedText
      role: LocalisedText
      bio?: LocalisedText
      photoUrl?: string
    }>
  }
  gallery: {
    title?: LocalisedText
    intro?: LocalisedText
    blocks: GalleryBlock[]
  }
  love_story: {
    title?: LocalisedText
    intro?: LocalisedText
    moments: StoryMoment[]
    /** Sign-off line under the last moment, e.g. "/ Alex & Mei /". */
    signature?: LocalisedText
  }
}

export type SectionDataFor<T extends SectionType> = SectionDataMap[T]

// ---------- Section instance ----------------------------------------------

export type SectionInstance<T extends SectionType = SectionType> = {
  type: T
  variant: string
  enabled: boolean
  order: number
  data: SectionDataFor<T>
  /** False once the customer manually picks this section's variant, which locks
   *  it against a Gaya preset auto-suggesting a different one. Absent/true means
   *  the variant is still "auto" and a Gaya may override it. */
  variantAuto?: boolean
}

// ---------- Section-v2 card shape -----------------------------------------

export type SectionCardData = {
  templateId: string
  theme: Theme
  sections: SectionInstance[]
  // Optional metadata for the editor
  schemaVersion?: 2
}

// ---------- Legacy card shape (pre-Section v2) -----------------------------

export type LegacyCardData = {
  templateId: string
  eventName: string
  eventDate: string
  eventTime: string
  venue: string
  venueAddress: string
  hostNames: string
  coverPhotoUrl?: string
  additionalMessage?: string
  rsvpEnabled: boolean
  rsvpDeadline?: string
  hashtag?: string
  brideName?: string
  groomName?: string
  brideParent?: string
  groomParent?: string
  program?: Array<{ time: string; event: string }>
  galleryUrls?: string[]
  contacts?: Array<{ name: string; phone: string; role: string }>
  caterers?: Array<{ name: string; food: string; phone: string; emoji: string }>
  gifts?: {
    banks?: Array<{ bank: string; accNumber: string; accName: string }>
    qrCodes?: Array<{ method: string; phone: string; name: string }>
    registry?: Array<{ id: number; name: string; price: string; link?: string; msg?: string }>
    shippingAddress?: string
  }
}

// ---------- Union + narrowing ---------------------------------------------

export type CardData = SectionCardData | LegacyCardData

export function isSectionCard(data: unknown): data is SectionCardData {
  return (
    typeof data === "object" &&
    data !== null &&
    "sections" in data &&
    Array.isArray((data as { sections: unknown }).sections)
  )
}

/**
 * Get the headline name to show for a card — used in metadata / dashboard list /
 * email subject. Works for both card shapes.
 */
export function getCardEventName(data: CardData): string {
  if (isSectionCard(data)) {
    const eventInfo = data.sections.find((s) => s.type === "event_info")
    if (eventInfo) {
      const ei = eventInfo.data as SectionDataMap["event_info"]
      return ei.eventName || "Invitation"
    }
    const landing = data.sections.find((s) => s.type === "landing")
    if (landing) {
      const ld = landing.data as SectionDataMap["landing"]
      return ld.headline || "Invitation"
    }
    return "Invitation"
  }
  return data.eventName || "Invitation"
}

// ---------- Lifecycle (derived, never customer-writable) -------------------

/** The invitation lifecycle states. Derived from durable facts only —
 *  see `deriveCardLifecycle` below; there is no lifecycle column in the DB.
 *
 *  - `editing`: the related order is not paid; the owner can edit and delete.
 *  - `paid_draft`: a confirmed payment (Stripe, Bank DuitNow, or Touch ’n
 *    Go) with one editable, unpublished draft.
 *  - `publishing`: the order is paid but the invitation is not publicly
 *    available yet and its latest recorded administrator action is not a
 *    disable — it is awaiting/retrying fulfilment.
 *  - `published`: the order is paid and the card is public. Guest-accessible.
 *  - `unavailable`: the order is paid, the card is not public, and the latest
 *    recorded administrator action is a disable with a recorded reason.
 *  - `edit_window`: an administrator-approved seven-day revision window is
 *    active; the guest boundary is private while the owner edits.
 *  - `edit_window_expired`: the revision remains private and locked until a
 *    new administrator grant.
 *  - `retired`: a completed controlled replacement cutover permanently
 *    removed the predecessor from guest access. */
export type CardLifecycle =
  | "editing"
  | "paid_draft"
  | "publishing"
  | "published"
  | "edit_window"
  | "edit_window_expired"
  | "unavailable"
  | "retired"

/** Administrator availability actions recorded on the append-only audit table. */
export type AvailabilityActionKind = "disabled" | "restored"

/** Customer-safe outcome states for a Mohon Suntingan request. */
export type CardEditRequestStatus = "pending" | "approved" | "rejected" | "stale"

/** Read-only request fields shared by the customer Dashboard and Admin queue. */
export type CardEditRequestSummary = {
  id: string
  card_id: string
  request_id: string
  reason: string
  status: CardEditRequestStatus
  decision: "approve" | "reject" | "stale" | null
  decision_reason: string | null
  submitted_at: string
  decided_at: string | null
  approved_edit_window_id?: string | null
}

/** Server-side and client-display helper for the administrator grant deadline. */
export function isEditWindowExpired(
  expiresAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  return !expiresAt || new Date(expiresAt).getTime() <= nowMs
}

export function deriveCardLifecycle(input: {
  orderPaid: boolean
  isPublished: boolean
  manualPaidDraft?: boolean
  latestAction?: AvailabilityActionKind | null
  firstPublishedAt?: string | null
  currentPublicationId?: string | null
  activeEditWindowId?: string | null
  editWindowExpiresAt?: string | null
  /** A completed controlled replacement cutover is terminal. */
  retired?: boolean
  nowMs?: number
}): CardLifecycle {
  if (input.retired) return "retired"
  if (!input.orderPaid) return "editing"
  if (input.latestAction === "disabled") return "unavailable"
  if (input.firstPublishedAt !== undefined && input.isPublished && !input.firstPublishedAt) {
    return "unavailable"
  }
  if (input.isPublished && input.currentPublicationId !== undefined && !input.currentPublicationId) {
    return "unavailable"
  }
  if (input.firstPublishedAt && input.currentPublicationId !== undefined && !input.currentPublicationId) {
    return "unavailable"
  }
  if (input.currentPublicationId && input.firstPublishedAt === undefined) return "unavailable"
  if (input.isPublished) return "published"
  if (input.firstPublishedAt && input.activeEditWindowId) {
    if (!input.editWindowExpiresAt) return "edit_window_expired"
    const now = input.nowMs ?? Date.now()
    return !isEditWindowExpired(input.editWindowExpiresAt, now)
      ? "edit_window"
      : "edit_window_expired"
  }
  if (input.firstPublishedAt) return "unavailable"
  return input.manualPaidDraft ? "paid_draft" : "publishing"
}

// ---------- Domain rows ----------------------------------------------------

/** Winning payment method recorded on a paid order. `null` while pending. */
export type PaymentMethod = "stripe" | "duitnow" | "tng"

/** Manual DuitNow review outcomes for the legacy transfer history. */
export type ReviewOutcome = "confirmed" | "rejected"

export type Template = {
  id: string
  name: string
  category: "wedding" | "birthday" | "corporate"
  thumbnail_url: string | null
  price_myr: number
  is_active: boolean
  config_schema: Record<string, unknown> | null
  // Section-v2 fields (nullable for legacy rows)
  type?: TemplateType | null
  theme?: Theme | null
  sections?: SectionInstance[] | null
}

/** Customer-safe checkout reservation metadata. It describes a payment guard,
 * never a fifth invitation lifecycle state. */
export type CheckoutReservationState = {
  reserved: boolean
  stripeSessionExpiresAt: string | null
}

export type Order = {
  id: string
  user_id: string | null
  template_id: string
  status: "pending" | "paid" | "failed"
  stripe_session_id: string | null
  /** Durable payment-workflow guard; not a lifecycle state or client-writable. */
  checkout_reservation_token?: string | null
  checkout_reserved_at?: string | null
  stripe_session_expires_at?: string | null
  price_myr: number
  custom_data: CardData | null
  /** Winning payment method — set exactly once by the first completion. */
  payment_method: PaymentMethod | null
  /** When the winning completion landed (Stripe webhook or confirmed review). */
  payment_completed_at: string | null
  /** Shared paid-draft entitlement; retained under its historical DB name. */
  manual_paid_draft?: boolean
  /** `controlled_replacement` is an administrator grant, not a payment. */
  entitlement_source?: "payment" | "controlled_replacement"
  replacement_grant_id?: string | null
  created_at: string
}

export type Card = {
  id: string
  order_id: string | null
  user_id: string | null
  template_id: string
  slug: string
  custom_data: CardData
  custom_data_draft?: CardData | null
  /** Mutable owner revision while an approved edit window is active. */
  revision_draft?: CardData | null
  /** One guarded pointer to the only guest-visible immutable publication. */
  current_publication_id?: string | null
  /** Grant currently controlling revision_draft, if any. */
  active_edit_window_id?: string | null
  /** Optimistic-concurrency version of the saved draft. Starts at 1. */
  draft_version: number
  /** Last successful customer draft save; null for historical rows. */
  last_activity_at: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
}

export type RSVPResponse = {
  id: string
  card_id: string
  publication_id: string | null
  guest_name: string
  guest_contact: string | null
  attending: boolean
  pax: number
  message: string | null
  created_at: string
}

export type CardAvailabilityActionRow = {
  id: string
  card_id: string
  admin_id: string
  action: AvailabilityActionKind
  reason: string | null
  created_at: string
}

export type UserProfile = {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: "customer" | "admin"
  created_at: string
}
