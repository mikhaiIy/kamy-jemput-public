/* Ambiguous terms to avoid, and honest coverage gaps. */

window.KAMY_GLOSSARY.avoid = [
  { term: "Component",
    kind: "qualify", domain: true,
    why: "Here it is the category for any reusable React unit, such as Navbar, Stat tile, or Footer column. The Core concepts section uses it far more narrowly, for the React function that draws a Section variant. Say \"Section renderer\" for that sense.",
    instead: ["landing-section", "rsvp-section"] },

  { term: "Gaya",
    kind: "qualify", domain: true,
    why: "Two different controls on the same screen use this word. In the editor sidebar it means the card-level theme preset. Inside the sub-form it labels the per-Section variant picker.",
    instead: ["gaya-panel", "variant-gallery"] },

  { term: "Preview",
    kind: "qualify", domain: true,
    why: "Four surfaces answer to this word. The iframe inside a gallery card. The iframe on the template detail page. The editor's inline right-pane render. The standalone /templates/preview/[id] route.",
    instead: ["gallery-preview-iframe", "detail-preview-iframe", "live-preview", "bare-preview-surface"] },

  { term: "Card",
    kind: "qualify", domain: true,
    why: "This word means at least four things. The `cards` database row. The rendered invitation. A gallery tile. The shadcn `Card` primitive in components/ui/card.tsx.",
    instead: ["template-showcase-card", "card-column", "card-row", "section-stack"] },

  { term: "Template",
    kind: "qualify", domain: true,
    why: "This names the catalogue entry a customer picks. It also names the legacy React components in components/templates/ and components/card-previews/ that draw whole legacy cards.",
    instead: ["template-showcase-card", "template-info-panel", "template-management-table"] },

  { term: "Theme",
    kind: "qualify", domain: true,
    why: "Three things carry this name. The card's `Theme` data object. A Gaya preset. The site's Tailwind design tokens.",
    instead: ["gaya-panel", "gaya-swatch"] },

  { term: "Hero",
    kind: "avoid",
    why: "Nothing in the code answers to this name. The card's cover screen is the `landing` Section. The templates page has a gallery hero, which is a different thing on a different surface.",
    instead: ["landing-section", "gallery-hero"] },

  { term: "Phone frame",
    kind: "qualify",
    why: "Three separate implementations carry this name. The gallery draws a 9:19 device frame. The detail page draws a fixed 295×640 frame. The editor uses the shared 340×712 PhonePreview.",
    instead: ["device-frame", "detail-preview-phone", "phone-preview-frame"] },

  { term: "Sidebar",
    kind: "qualify",
    why: "Only the editor has a sidebar. The admin area uses a horizontal nav instead.",
    instead: ["section-sidebar", "admin-nav"] },

  { term: "Section",
    kind: "qualify", domain: true,
    why: "The product concept is a `SectionInstance` on a card. An ordinary page region is not. A `<section>` element on the templates page is not a Section.",
    instead: ["section-stack", "section-row", "landing-section"] },

  { term: "Modal / popup",
    kind: "avoid",
    why: "No flow documented here uses the shadcn Dialog. The add-section picker is an inline panel inside the sidebar.",
    instead: ["add-section-button"] },

  { term: "Menu",
    kind: "qualify",
    why: "The Navbar contains navigation links and a hamburger button. The hamburger opens the Account menu on desktop and mobile.",
    instead: ["navbar", "mobile-nav-panel", "admin-nav"] },

  { term: "Payment retry",
    kind: "qualify",
    why: "A Stripe Checkout retry reuses a durable reservation when Stripe confirms its Session is still open, but Stripe cannot begin while a DuitNow submission is unreviewed. A rejected DuitNow retry is a fresh immutable submission, while an old rejected record remains history.",
    instead: ["stripe-choice", "rejected-state"] },

  { term: "Checkout expiry",
    kind: "qualify",
    why: "The local stored expiry is not proof a Checkout Session cannot charge. Only Stripe-confirmed expiry permits the exact reservation/session handoff to DuitNow.",
    instead: ["payment-method-choice", "payment-cancelled"] },

  { term: "Publish button",
    kind: "avoid",
    why: "Customer publication is a separate paid-draft action, not a payment side effect. When the paid-draft UI exposes this control, it must flush the latest saved version, require the exact public/read-only acknowledgement, and leave administrator disable/restore as a separate control.",
    instead: ["continue-to-payment-button", "publish-status-badge"] },

  { term: "Save button",
    kind: "avoid",
    why: "The editor has no save button. Drafts save on a debounce. The save indicator reports the result.",
    instead: ["save-indicator"] },

  { term: "RSVP form",
    kind: "qualify",
    why: "Two things carry this name. The `rsvp` Section that cards render. The older standalone components/RSVPForm.tsx that the legacy card path uses.",
    instead: ["rsvp-section"] },
]

window.KAMY_GLOSSARY.gaps = [
  { area: "Auth pages", detail: "No plate covers /login, /register, /forgot-password, or /reset-password. The register PDPA consent checkbox has no term yet.",
    src: "app/(auth)/" },
  { area: "RSVP responses page", detail: "The host's RSVP response table at /dashboard/cards/[id]/rsvp has no plate.",
    src: "app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx" },
  { area: "Custom order flow", detail: "Only the custom order link and the admin nav reference /templates/custom and the admin Tempahan Khas queue.",
    src: "app/(public)/templates/custom/, app/(admin)/admin/custom-orders/" },
  { area: "Admin card detail", detail: "The /admin payment controls are covered by the Admin DuitNow payments plate, but the individual /admin/cards/[id] lifecycle detail remains wireframe-only outside that payment surface.",
    src: "app/(admin)/admin/cards/[id]/" },
  { area: "Section internals", detail: "Each Section gets one term. The parts inside a variant have none. That covers the 8 landing variants, the 6 live RSVP variants, and the wishlist tabs.",
    src: "components/sections/" },
  { area: "Legacy card path", detail: "components/InvitationCard.tsx, components/templates/*, and components/card-previews/* draw pre-Section-v2 cards. Only the Section-v2 path has terms.",
    src: "components/InvitationCard.tsx" },
  { area: "Email templates", detail: "The Resend order-confirmed and RSVP-notification emails are interfaces too. They have no terms.",
    src: "components/emails/" },
  { area: "Error and loading states", detail: "No plate covers the per-group error.tsx, loading.tsx, or not-found.tsx files.",
    src: "app/(public)/error.tsx and siblings" },
  { area: "Screenshots for auth-gated routes", detail: "The section editor, dashboard, checkout, and admin plates use wireframes only. This project points at a hosted Supabase. A capture would mean creating real accounts and rows.",
    src: "docs/ui-glossary/capture.mjs" },
]
