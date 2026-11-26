/* Wireframe plates. Each node is { c: class, t: target-id, x: text, k: [kids] }.
 *
 * These are RECONSTRUCTIONS drawn from the source files listed on each plate —
 * never screenshots. They exist so connectors can anchor to real DOM elements
 * and re-solve on resize, which fixed-coordinate overlays on a bitmap cannot do.
 * Proportions follow the real CSS (grid tracks, fixed widths) but are not
 * pixel-exact; the labelled parts and their order are.
 */

window.KAMY_GLOSSARY.plates = [
  {
    "id": "admin-workspace",
    "name": "Administrator workspace",
    "route": "/admin, /admin/orders, /admin/payments, /admin/custom-orders, /admin/cards/[id]",
    "group": "Admin",
    "summary": "Separate overview, order list and review destinations inside the persistent sidebar. Search and filters narrow complete server-loaded tables; details open inline.",
    "sources": [
      "app/(admin)/AdminNav.tsx",
      "app/(admin)/AdminTable.tsx",
      "app/(admin)/admin/page.tsx",
      "app/(admin)/admin/orders/page.tsx",
      "app/(admin)/admin/payments/page.tsx",
      "app/(admin)/admin/custom-orders/page.tsx",
      "app/(admin)/admin/cards/[id]/page.tsx",
      "app/(preview)/admin/cards/[id]/preview/page.tsx",
      "components/PhonePreview.tsx"
    ],
    "screenshots": {},
    "screenshotNote": "Verified on desktop and mobile using isolated fixtures.",
    "wireframe": {
      "c": "wf wf-admin",
      "k": [
        {
          "c": "wf-adminnav",
          "x": "Pengurusan | Cipta & uji | Account: quiet Logout navigation action"
        },
        {
          "c": "wf-panel",
          "t": "admin.overview",
          "x": "Ringkasan: resit menunggu · pesanan belum dibayar · tempahan baharu · pesanan terkini"
        },
        {
          "c": "wf-alert",
          "t": "admin.payment-notification",
          "x": "0 resit baharu menunggu perhatian · Semak bayaran"
        },
        {
          "c": "wf-input",
          "t": "admin.search",
          "x": "Cari nama, e-mel atau ID…"
        },
        {
          "c": "wf-chips",
          "t": "admin.filters",
          "x": "Status · Kategori · Kosongkan penapis"
        },
        {
          "c": "wf-table",
          "t": "admin.orders",
          "x": "Pelanggan / Pesanan · Template · Jumlah · Bayaran · Tarikh · Jemputan"
        },
        {
          "c": "wf-table",
          "t": "admin.payments",
          "x": "Pelanggan / Pesanan · Kaedah · Harga / Diterima · Status · Dihantar · Semak resit"
        },
        {
          "c": "wf-table",
          "t": "admin.custom",
          "x": "Pelanggan · Majlis · Bajet · Status · Diterima"
        },
        {
          "c": "wf-table",
          "t": "admin.edit-requests",
          "x": "Mohon Suntingan · Pelanggan · Sebab · Status · Dihantar"
        },
        {
          "c": "wf-panel",
          "t": "admin.details",
          "x": "Butiran pesanan / resit / permintaan · Tindakan berkaitan"
        },
        {
          "c": "wf-panel",
          "t": "admin.edit-request-controls",
          "x": "Luluskan 7 hari · Tolak permintaan · Sebab pelanggan"
        },
        {
          "c": "wf-btn",
          "t": "admin.pagination",
          "x": "Halaman 1 / 2 · Sebelum · Seterusnya"
        },
        {
          "c": "wf-panel",
          "t": "receipt.viewer",
          "x": "Resit bayaran · Versi / Pesanan · Pratonton imej atau PDF · Saiz asal · Muat turun · Tutup"
        },
        {
          "c": "wf-phone",
          "t": "admin.invitation-preview",
          "x": "Pratonton jemputan · Bingkai telefon · Tatal dalam iframe · Draf tersimpan terkini"
        },
        {
          "c": "wf-panel",
          "t": "admin.confirmation",
          "x": "Sahkan tindakan · Sebab / Jumlah · Batal · Sahkan"
        }
      ]
    }
  },
  /* ---------------------------------------------------------------- shell */
  {
    id: "site-shell",
    name: "Site shell",
    route: "/, /templates, /privacy, /terms, /dashboard",
    group: "Shell",
    summary:
      "The Navbar + Footer wrapper applied by the (public) and (dashboard) route groups. The (invite) and (preview) groups deliberately have none of it.",
    sources: [
      "app/(public)/layout.tsx",
      "components/Navbar.tsx",
      "components/Navbar.module.css",
      "components/NavbarMenu.tsx",
      "components/LogoutButton.tsx",
      "components/Footer.tsx",
      "components/Footer.module.css",
    ],
    screenshots: { desktop: "site-shell-desktop.jpg", mobile: "site-shell-mobile.jpg" },
    screenshotRoute: "/",
    wireframe: {
      c: "wf wf-shell",
      k: [
        {
          c: "wf-navbar", t: "shell.navbar",
          k: [
            { c: "wf-brand", t: "shell.brand", x: "kamy jemput" },
            {
              c: "wf-navlinks", t: "shell.nav-links",
              k: [
                { c: "wf-navlink", x: "Templates" },
                { c: "wf-navlink wf-admin", t: "shell.admin-link", x: "Admin" },
                { c: "wf-navlink", x: "Log masuk" },
                { c: "wf-btn wf-btn-primary", t: "shell.register-cta", x: "Mula Sekarang" },
              ],
            },
            { c: "wf-hamburger", t: "shell.menu-button", x: "☰ · Signed in: all widths; visitors: mobile" },
          ],
        },
        { c: "wf-mobilepanel", t: "shell.mobile-panel", k: [
          { c: "wf-eyebrow", x: "Hamburger open · Account menu" },
          { c: "wf-navlink", x: "Mobile navigation: Templates · Dashboard / Log masuk" },
          { c: "wf-btn wf-btn-primary wf-w-full", x: "Mobile visitor: Mula Sekarang" },
          { c: "wf-eyebrow", x: "Signed in: Akaun" },
          { c: "wf-navlink", t: "shell.logout", x: "Logout · quiet plum icon + text" },
        ] },
        { c: "wf-main", t: "shell.page-body", x: "page content" },
        {
          c: "wf-footer", t: "shell.footer",
          k: [
            {
              c: "wf-footer-top",
              k: [
                { c: "wf-footer-brand", k: [
                  { c: "wf-brand wf-on-dark", x: "kamy jemput" },
                  { c: "wf-muted-line" },
                ] },
                { c: "wf-footer-cols", k: [
                  { c: "wf-footer-col", t: "shell.footer-column", k: [
                    { c: "wf-eyebrow", x: "Produk" },
                    { c: "wf-line" }, { c: "wf-line" },
                  ] },
                  { c: "wf-footer-col", k: [
                    { c: "wf-eyebrow", x: "Syarikat" },
                    { c: "wf-line" }, { c: "wf-line" },
                  ] },
                ] },
              ],
            },
            { c: "wf-footer-legal", t: "shell.footer-legal", x: "© 2026 kamy · Dibuat di Malaysia" },
          ],
        },
      ],
    },
  },

  /* -------------------------------------------------------------- gallery */
  {
    id: "templates-gallery",
    name: "Templates gallery",
    aliases: ["Template gallery", "catalogue page"],
    route: "/templates",
    group: "Browse",
    summary:
      "The catalogue page. A hero, a search field, a category filter strip, and a responsive grid of showcase cards that each embed a live preview iframe. Only entries backed by an active templates row render; a failed row query swaps the whole gallery for its error state.",
    sources: [
      "app/(public)/templates/page.tsx",
      "app/(public)/templates/templates-page.module.css",
      "components/TemplatesGallery.tsx",
      "components/TemplatesGallery.module.css",
      "components/TemplateShowcaseCard.tsx",
    ],
    screenshots: { desktop: "templates-gallery-desktop.jpg", mobile: "templates-gallery-mobile.jpg" },
    screenshotRoute: "/templates",
    wireframe: {
      c: "wf wf-gallery",
      k: [
        { c: "wf-hero", t: "gallery.hero", k: [
          { c: "wf-eyebrow wf-gold", t: "gallery.eyebrow", x: "Koleksi Template" },
          { c: "wf-title", t: "gallery.title", x: "Pilih reka bentuk yang terasa seperti anda." },
          { c: "wf-intro", x: "Arahkan tetikus untuk menatal template…" },
        ] },
        { c: "wf-customrow", t: "gallery.custom-order-link", x: "Tidak jumpa? Tempahan khas →" },
        { c: "wf-filtermeta", k: [
          { c: "wf-fieldgroup", t: "gallery.search-field", k: [
            { c: "wf-label", x: "Cari" },
            { c: "wf-input", x: "Cari nama, mood…" },
          ] },
          { c: "wf-filterstrip", t: "gallery.filter-strip", k: [
            { c: "wf-pill wf-pill-on", t: "gallery.filter-pill", x: "Semua" },
            { c: "wf-pill", x: "Perkahwinan" },
            { c: "wf-pill", x: "Hari Jadi" },
            { c: "wf-pill", x: "Rumah Terbuka" },
            { c: "wf-pill", x: "Aqiqah" },
          ] },
          { c: "wf-count", t: "gallery.result-count", x: "21 reka bentuk" },
        ] },
        { c: "wf-grid", t: "gallery.grid", k: [
          { c: "wf-cell", t: "gallery.showcase-card", k: [
            { c: "wf-phone", t: "gallery.device-frame", k: [
              { c: "wf-island" },
              { c: "wf-screen", t: "gallery.preview-iframe", k: [
                { c: "wf-fallback", t: "gallery.fallback-face", x: "Sarah & Adam" },
              ] },
              { c: "wf-chip", t: "gallery.category-chip", x: "Perkahwinan" },
              { c: "wf-afford", t: "gallery.preview-affordance", x: "Pratonton ↗" },
            ] },
            { c: "wf-meta", k: [
              { c: "wf-meta-name", t: "gallery.template-name", x: "Siti & Danish" },
              { c: "wf-meta-price-coming", t: "gallery.template-price", x: "RM 49" },
              { c: "wf-meta-mood", t: "gallery.template-mood", x: "Lembut & Klasik" },
            ] },
          ] },
          { c: "wf-cell", k: [ { c: "wf-phone", k: [ { c: "wf-island" }, { c: "wf-screen" } ] } ] },
          { c: "wf-cell wf-hide-sm", k: [ { c: "wf-phone", k: [ { c: "wf-island" }, { c: "wf-screen" } ] } ] },
          { c: "wf-cell wf-hide-sm", k: [ { c: "wf-phone", k: [ { c: "wf-island" }, { c: "wf-screen" } ] } ] },
        ] },
        { c: "wf-empty", t: "gallery.error-state", x: "Reka bentuk tidak dapat dimuatkan — cuba lagi nanti" },
        { c: "wf-empty", t: "gallery.empty-state", k: [
          { c: "wf-hint", x: "Tiada reka bentuk sepadan" },
          { c: "wf-minibtn", t: "gallery.empty-reset", x: "Kosongkan carian" },
          { c: "wf-minibtn", x: "Papar semua kategori" },
        ] },
      ],
    },
  },

  /* --------------------------------------------------------------- detail */
  {
    id: "template-detail",
    name: "Template detail",
    route: "/templates/[id]",
    group: "Browse",
    summary:
      "Two equal columns above 1024px: a live preview phone on the left, a sticky info panel with price and the customise CTA on the right. Below 1024px the grid is one column, with the preview phone above a static info panel. A known id without an active templates row shows the Coming soon block instead of price or CTA; an unknown id is notFound().",
    sources: [
      "app/(public)/templates/[id]/page.tsx",
      "app/(public)/templates/[id]/template-detail.module.css",
    ],
    screenshots: { desktop: "template-detail-desktop.jpg", mobile: "template-detail-mobile.jpg" },
    screenshotRoute: "/templates/malay-wedding",
    warning:
      "The bundled mobile screenshot was captured before the responsive fix and still shows the pre-fix two-column overlap. The current code collapses to one column below 1024px. Re-run capture.mjs to refresh it.",
    wireframe: {
      c: "wf wf-detail",
      k: [
        { c: "wf-back", t: "detail.back-link", x: "← Kembali ke Templates" },
        { c: "wf-detail-grid", t: "detail.grid", k: [
          { c: "wf-detail-left", k: [
            { c: "wf-eyebrow", x: "Pratonton Langsung" },
            { c: "wf-phone wf-phone-lg", t: "detail.preview-phone", k: [
              { c: "wf-island" },
              { c: "wf-screen", t: "detail.preview-iframe", x: "iframe" },
            ] },
            { c: "wf-hint", x: "Skrol dalam telefon…" },
          ] },
          { c: "wf-detail-right", t: "detail.info-panel", k: [
            { c: "wf-badge", t: "detail.category-badge", x: "Perkahwinan" },
            { c: "wf-title wf-title-sm", t: "detail.title", x: "Malay Wedding" },
            { c: "wf-intro", x: "Tradisional & elegan dengan motif bunga" },
            { c: "wf-price", t: "detail.price", x: "RM 49" },
            { c: "wf-features", t: "detail.feature-list", k: [
              { c: "wf-feature", x: "✓ Laman web jemputan yang cantik" },
              { c: "wf-feature", x: "✓ Papan pemuka RSVP" },
              { c: "wf-feature", x: "✓ Peta & butang kalender" },
            ] },
            { c: "wf-btn wf-btn-primary wf-w-full", t: "detail.customise-cta", x: "Sesuaikan Template Ini →" },
            { c: "wf-hint", x: "Anda perlu log masuk untuk meneruskan." },
            { c: "wf-btn wf-w-full", t: "detail.coming-soon-block", x: "Akan Datang (no active row)" },
          ] },
        ] },
      ],
    },
  },

  /* -------------------------------------------------------- card preview */
  {
    id: "card-preview",
    name: "Card preview route",
    route: "/templates/preview/[id]",
    group: "Browse",
    summary:
      "A bare card rendered from hard-coded demo data, with no navbar or footer. It exists to be embedded in an iframe by the gallery card and the template detail phone.",
    sources: [
      "app/(preview)/templates/preview/[id]/page.tsx",
      "app/(preview)/not-found.tsx",
      "lib/preview-templates.ts",
    ],
    screenshots: { mobile: "card-preview-mobile.jpg" },
    screenshotRoute: "/templates/preview/malay-wedding",
    wireframe: {
      c: "wf wf-cardpreview",
      k: [
        { c: "wf-bare", t: "preview.bare-surface", k: [
          { c: "wf-sec wf-sec-hero", t: "preview.demo-data", x: "Sarah & Adam · demo data" },
          { c: "wf-sec", x: "Event info" },
          { c: "wf-sec", x: "Program" },
          { c: "wf-cardfoot", x: "kamy jemput" },
        ] },
      ],
    },
  },

  /* ---------------------------------------------------------- invitation */
  {
    id: "invitation-card",
    name: "Published card",
    aliases: ["Published invitation", "invitation page", "guest card"],
    route: "/i/[slug]",
    group: "Guest",
    summary:
      "What a guest opens. A centred phone-width column on a tinted gutter, filled with the enabled Sections in order.",
    sources: [
      "app/(invite)/i/[slug]/page.tsx",
      "app/(invite)/layout.tsx",
      "components/SectionInvitationCard.tsx",
      "lib/sections/theme.ts",
    ],
    screenshots: { desktop: "invitation-card-desktop.jpg", mobile: "invitation-card-mobile.jpg" },
    screenshotRoute: "/templates/preview/malay-wedding-v2",
    screenshotNote:
      "Captured through /templates/preview/malay-wedding-v2, which renders the same SectionInvitationCard section stack from demo data. The /i/[slug] gutter and 480px column are NOT in this capture — publishing a real card would mean writing to the hosted Supabase project. Those two parts are wireframe-only.",
    wireframe: {
      c: "wf wf-invite",
      k: [
        { c: "wf-gutter", t: "invite.gutter", k: [
          { c: "wf-column", t: "invite.column", k: [
            { c: "wf-stack", t: "invite.section-stack", k: [
              { c: "wf-sec wf-sec-hero", t: "invite.landing-section", k: [
                { c: "wf-sec-tag", x: "landing" },
                { c: "wf-headline", t: "invite.headline", x: "Sarah & Adam" },
                { c: "wf-tagline", t: "invite.tagline", x: "Walimatul Urus" },
              ] },
              { c: "wf-sec", t: "invite.event-info-section", k: [
                { c: "wf-sec-tag", x: "event_info" },
                { c: "wf-kv", t: "invite.venue-field", x: "Dewan Seri Budiman" },
              ] },
              { c: "wf-sec", t: "invite.countdown-section", k: [ { c: "wf-sec-tag", x: "countdown" } ] },
              { c: "wf-sec", t: "invite.rsvp-section", k: [
                { c: "wf-sec-tag", x: "rsvp" },
                { c: "wf-input" },
                { c: "wf-btn wf-btn-primary wf-w-full", x: "Hantar" },
              ] },
              { c: "wf-sec", t: "invite.guestbook-section", k: [ { c: "wf-sec-tag", x: "guestbook" } ] },
            ] },
            { c: "wf-notice", t: "invite.edit-window-notice", x: "Customer name is making edits. Please wait." },
            { c: "wf-cardfoot", t: "invite.card-footer", x: "kamy jemput" },
          ] },
        ] },
      ],
    },
  },

  /* -------------------------------------------------------------- editor */
  {
    id: "section-editor",
    name: "Section editor",
    route: "/dashboard/cards/[id]/edit",
    group: "Build",
    summary:
      "The three-pane editor: Gaya + section list on the left, the active section's sub-form in the centre, a live preview on the right. Paid drafts also expose a responsive publication acknowledgement dialog that flushes the latest saved version before making the invitation public and read-only. A five-step Malay tour (launched once per account, replayable from the Help control) overlays these surfaces — it measures the complete panel height to select and clamp a Navbar-safe position inside the viewport, with its dimmed overlay stacked above that bar. Below 1024px the editor renders the canvas-first Mobile Section editor instead, with its own six-step tour.",
    sources: [
      "app/(dashboard)/dashboard/cards/[id]/edit/page.tsx",
      "components/SectionEditor.tsx",
      "components/SectionEditorTour.tsx",
      "app/actions/editor-help.ts",
      "components/PhonePreview.tsx",
      "components/SectionInvitationCard.tsx",
      "lib/sections/registry.ts",
      "lib/themes/presets.ts",
    ],
    screenshots: {},
    screenshotNote:
      "No screenshot. The route is behind proxy auth against a hosted Supabase project, so capturing it would mean creating a real account and a real card row. Wireframe only.",
    warning:
      "`threePaneStyle` is a fixed `grid-template-columns: 260px 1fr 360px` used at 1024px and wider. Below that breakpoint the editor renders the canvas-first Mobile Section editor shell instead (see that plate). The Help control and the Section editor tour exist on both viewports, each with its own five-step Malay list; the desktop panel measures its complete height to select and clamp a Navbar-safe position, while the mobile panel reserves the 76px navigation rail and places itself opposite its target.",
    wireframe: {
      c: "wf wf-editor",
      k: [
        { c: "wf-topbar", t: "editor.top-bar", k: [
          { c: "wf-back", x: "← Dashboard" },
          { c: "wf-topbar-mid", k: [
            { c: "wf-strong", x: "Malay Wedding" },
            { c: "wf-save", t: "editor.save-indicator", x: "Disimpan ✓" },
          ] },
          { c: "wf-minibtn", t: "editor.help-control", x: "Bantuan" },
          { c: "wf-btn wf-btn-primary", t: "editor.pay-button", x: "Teruskan ke Pembayaran — RM 49 / Semak Status Bayaran" },
        ] },
        { c: "wf-btn wf-btn-primary", t: "editor.publish-button", x: "Terbitkan Jemputan" },
        { c: "wf-alert", t: "editor.revision-deadline", x: "Suntingan diluluskan · Tamat 14 Sep 2026 14:05" },
        { c: "wf-alert", t: "editor.controlled-replacement", x: "Penggantian diluluskan pentadbir · Sedia untuk persediaan aset · Tiada pembayaran diperlukan" },
        { c: "wf-panel", t: "editor.publication-dialog", k: [
          { c: "wf-title", x: "Terbitkan jemputan" },
          { c: "wf-input", x: "☐ I understand that this invitation will become public and read-only." },
          { c: "wf-alert", t: "editor.draft-conflict", x: "Draf berubah di tempat lain · Muat semula" },
          { c: "wf-row-actions", k: [
            { c: "wf-btn", x: "Batal" },
            { c: "wf-btn wf-btn-primary", x: "Terbitkan sekarang" },
          ] },
        ] },
        { c: "wf-alert", t: "editor.validation-banner", x: "role=\"alert\" · ralat medan" },
        { c: "wf-three", t: "editor.three-pane", k: [
          { c: "wf-side", t: "editor.sidebar", k: [
            { c: "wf-gaya", t: "editor.gaya-panel", k: [
              { c: "wf-swatch", t: "editor.gaya-swatch" },
              { c: "wf-gaya-txt", k: [
                { c: "wf-eyebrow", x: "Gaya / Tema" },
                { c: "wf-strong", x: "Amber Classic" },
              ] },
              { c: "wf-caret", x: "▾" },
            ] },
            { c: "wf-sidehead", t: "editor.section-list-header", x: "Bahagian" },
            { c: "wf-list", t: "editor.section-list", k: [
              { c: "wf-row wf-row-on", t: "editor.section-row", k: [
                { c: "wf-drag", t: "editor.drag-handle", x: "⋮⋮" },
                { c: "wf-dot", t: "editor.status-dot" },
                { c: "wf-row-label", x: "Laman Utama" },
                { c: "wf-icon", t: "editor.visibility-toggle", x: "👁" },
                { c: "wf-icon", t: "editor.remove-button", x: "×" },
              ] },
              { c: "wf-row", k: [
                { c: "wf-drag", x: "⋮⋮" }, { c: "wf-dot wf-dot-draft" },
                { c: "wf-row-label", x: "Maklumat Majlis" },
                { c: "wf-icon", x: "👁" }, { c: "wf-icon", x: "×" },
              ] },
              { c: "wf-row wf-row-off", k: [
                { c: "wf-drag", x: "⋮⋮" }, { c: "wf-dot wf-dot-err" },
                { c: "wf-row-label", x: "RSVP" },
                { c: "wf-icon", x: "⊘" }, { c: "wf-icon", x: "×" },
              ] },
            ] },
            { c: "wf-addbtn", t: "editor.add-section-button", x: "+ Tambah Bahagian" },
          ] },
          { c: "wf-center", t: "editor.sub-form", k: [
            { c: "wf-subhead", t: "editor.sub-form-header", k: [
              { c: "wf-h2", x: "Laman Utama" },
              { c: "wf-hint", x: "Landing · #1" },
            ] },
            { c: "wf-fieldgroup", k: [
              { c: "wf-label", x: "Gaya" },
              { c: "wf-variants", t: "editor.variant-gallery", k: [
                { c: "wf-variant wf-variant-on", t: "editor.variant-tile", k: [ { c: "wf-swatch wf-swatch-sm" }, { c: "wf-variant-label", x: "Foto Hero" } ] },
                { c: "wf-variant", k: [ { c: "wf-swatch wf-swatch-sm" }, { c: "wf-variant-label", x: "Minimalis" } ] },
                { c: "wf-variant", k: [ { c: "wf-swatch wf-swatch-sm" }, { c: "wf-variant-label", x: "Kinetik" } ] },
              ] },
            ] },
            { c: "wf-fieldgroup", k: [
              { c: "wf-label", x: "headline" },
              { c: "wf-input", t: "editor.form-field", x: "Sarah & Adam" },
            ] },
            { c: "wf-fieldgroup", k: [
              { c: "wf-label", x: "tagline" },
              { c: "wf-input", x: "Walimatul Urus" },
            ] },
          ] },
          { c: "wf-preview", t: "editor.preview-pane", k: [
            { c: "wf-prevbar", k: [
              { c: "wf-eyebrow", x: "Pratonton" },
              { c: "wf-segment", t: "editor.preview-mode-toggle", k: [
                { c: "wf-seg wf-seg-on", x: "Telefon" },
                { c: "wf-seg", x: "Lebar" },
              ] },
            ] },
            { c: "wf-phone wf-phone-md", t: "editor.phone-frame", k: [
              { c: "wf-speaker" },
              { c: "wf-screen", t: "editor.live-preview", k: [
                { c: "wf-sec wf-sec-hero wf-sec-xs", x: "Sarah & Adam" },
                { c: "wf-sec wf-sec-xs" },
              ] },
            ] },
            { c: "wf-hint", x: "Kemas kini secara langsung" },
          ] },
        ] },
        { c: "wf-tour-overlay", t: "editor.tour-overlay", k: [
          { c: "wf-hint", x: "Panel penuh diukur dan diapit selamat di bawah bar navigasi (58px) · Overlay di atasnya (z-index 120 > 100)" },
          { c: "wf-subhead", k: [
            { c: "wf-strong", x: "Panduan Penyunting · Langkah 1 / 5" },
            { c: "wf-icon", x: "×" },
          ] },
          { c: "wf-hint", x: "Menyorot: Section sidebar · Sub-form · Live preview pane · Save indicator · Continue to payment button" },
          { c: "wf-line" },
          { c: "wf-row-actions", k: [
            { c: "wf-minibtn", x: "Kembali" },
            { c: "wf-btn wf-btn-primary", x: "Seterusnya" },
          ] },
        ] },
      ],
    },
  },

  /* Canvas-first mobile shell (below 1024px). */
  {
    id: "mobile-section-editor",
    name: "Mobile Section editor",
    route: "/dashboard/cards/[id]/edit",
    group: "Build",
    summary:
      "The canvas-first mobile shell: the live card fills the screen at native width with no device bezel, the active Section's form sits in a draggable bottom sheet with three detents, and a navigation rail steps through the enabled Sections. The ☰ rail button opens the full Section stack screen over the card. A six-step Malay tour overlays these surfaces — it switches to the Section stack screen for its Susun Bahagian step and restores the pane on exit — with its own step list separate from the desktop tour.",
    sources: [
      "components/SectionEditor.tsx",
      "components/SectionEditorTour.tsx",
      "components/PhonePreview.tsx",
      "components/SectionInvitationCard.tsx",
      "app/globals.css",
    ],
    screenshots: {},
    screenshotNote:
      "No screenshot. The route is behind proxy auth against an isolated Supabase project, so capturing it would mean creating a real account and a real card row. Wireframe only.",
    wireframe: {
      c: "wf wf-editor",
      k: [
        { c: "wf-phone wf-phone-lg", k: [
          { c: "wf-speaker" },
          { c: "wf-screen", t: "mobile.canvas", k: [
            { c: "wf-sec wf-sec-hero wf-sec-xs", x: "Sarah & Adam" },
            { c: "wf-sec wf-sec-xs" },
            { c: "wf-panel", t: "mobile.sheet", k: [
              { c: "wf-subhead", k: [
                { c: "wf-strong", x: "Maklumat Majlis" },
                { c: "wf-segment", t: "mobile.detents", k: [
                  { c: "wf-seg", x: "▁" },
                  { c: "wf-seg wf-seg-on", x: "▄" },
                  { c: "wf-seg", x: "█" },
                ] },
              ] },
              { c: "wf-input-xs", x: "Isi maklumat Bahagian di sini" },
            ] },
            { c: "wf-segment", t: "mobile.rail", k: [
              { c: "wf-seg", x: "← Kembali" },
              { c: "wf-seg", x: "☰" },
              { c: "wf-seg wf-seg-on", x: "Seterusnya →" },
            ] },
          ] },
        ] },
        { c: "wf-phone wf-phone-lg", k: [
          { c: "wf-speaker" },
          { c: "wf-screen", k: [
            { c: "wf-stack", t: "mobile.stack", k: [
              { c: "wf-sidehead", x: "Bahagian" },
              { c: "wf-row wf-row-on", k: [
                { c: "wf-drag", x: "⋮⋮" },
                { c: "wf-tour-arrow", t: "mobile.reorder-arrow", x: "↕" },
                { c: "wf-dot" },
                { c: "wf-row-label", x: "Pembukaan" },
                { c: "wf-icon", x: "👁" },
                { c: "wf-icon", x: "×" },
              ] },
              { c: "wf-row", k: [
                { c: "wf-drag", x: "⋮⋮" },
                { c: "wf-dot wf-dot-draft" },
                { c: "wf-row-label", x: "Maklumat Majlis" },
                { c: "wf-icon", x: "👁" },
                { c: "wf-icon", x: "×" },
              ] },
              { c: "wf-addbtn", x: "+ Tambah Bahagian" },
            ] },
          ] },
        ] },
      ],
    },
  },

  /* Dashboard phone renders. */
  {
    "id": "dashboard",
    "name": "Dashboard",
    "route": "/dashboard",
    "group": "Build",
    "summary": "Small phone renders in one selected group, with sticky filters, search and six invitations per page. Grouping uses next action and event timing in Kuala Lumpur. Each Card row gives one state-specific primary action; published invitations expose RSVP and sharing.",
    "sources": [
      "app/(dashboard)/dashboard/page.tsx",
      "app/(dashboard)/dashboard/DeleteCardButton.tsx",
      "app/(dashboard)/dashboard/InvitationGallery.tsx",
      "app/(dashboard)/layout.tsx",
      "components/InvitationThumbnail.tsx",
      "components/ui/confirmation-dialog.tsx"
    ],
    "screenshots": {},
    "screenshotNote": "Wireframe reconstruction of the isolated development app.",
    "wireframe": {
      "c": "wf wf-dash",
      "k": [
        {
          "c": "wf-dashhead",
          "t": "dash.header",
          "k": [
            {
              "c": "wf-title wf-title-sm",
              "x": "Jemputan saya"
            },
            {
              "c": "wf-btn wf-btn-primary",
              "t": "dash.new-invitation-button",
              "x": "+ Jemputan baharu"
            }
          ]
        },
        {
          "c": "wf-pills",
          "t": "dash.group-navigation",
          "x": "Sticky filters flush below Navbar · [Perlu perhatian 3] · Akan datang 2 · Majlis lepas 1"
        },
        { "c": "wf-input", "t": "dash.search", "x": "Cari nama, pautan atau tarikh… · Kosongkan" },
        {
          "c": "wf-panel",
          "t": "dash.delete-dialog",
          "x": "Padam jemputan ini? · Batal / Padam jemputan · Ralat kekal di dalam dialog"
        },
        {
          "c": "wf-cardlist",
          "t": "dash.card-list",
          "k": [
            {
              "c": "wf-group",
              "t": "dash.group-current",
              "k": [
                {
                  "c": "wf-eyebrow",
                  "x": "Perlu perhatian"
                },
                {
                  "c": "wf-cardrow",
                  "t": "dash.card-row",
                  "k": [
                    {
                      "c": "wf-phone-mini",
                      "t": "dash.invitation-preview",
                      "x": "Paparan telefon · Draf tersimpan"
                    },
                    {
                      "c": "wf-strong",
                      "x": "Aqiqah Danish"
                    },
                    {
                      "c": "wf-badge",
                      "t": "dash.lifecycle-badge",
                      "x": "Draf"
                    },
                    {
                      "c": "wf-hint",
                      "x": "Tarikh belum ditetapkan"
                    },
                    {
                      "c": "wf-minibtn",
                      "t": "dash.invitation-details",
                      "x": "Butiran · nama penuh, status, sebab dan hasil permintaan"
                    },
                    {
                      "c": "wf-cardrow-acts",
                      "t": "dash.row-actions",
                      "x": "Aligned primary: Sambung suntingan · Secondary slot: [Padam draf]"
                    }
                  ]
                },
                {
                  "c": "wf-cardrow",
                  "k": [
                    {
                      "c": "wf-badge",
                      "t": "dash.edit-request-status",
                      "x": "Menunggu semakan · Jemputan kekal dalam keadaan semasa"
                    },
                    {
                      "c": "wf-minibtn",
                      "t": "dash.edit-request-dialog",
                      "x": "Secondary slot: Mohon Suntingan · Sebab · Hantar permintaan (desktop reserves this row when no trigger; mobile collapses it)"
                    }
                  ]
                },
                {
                  "c": "wf-cardrow",
                  "k": [
                    {
                      "c": "wf-phone-mini",
                      "x": "Paparan telefon"
                    },
                    {
                      "c": "wf-strong",
                      "x": "Sarah & Adam"
                    },
                    {
                      "c": "wf-badge",
                      "t": "dash.paid-draft-indicator",
                      "x": "Sedia untuk diterbitkan / Draf penggantian pentadbir"
                    },
                    {
                      "c": "wf-hint",
                      "t": "dash.manual-payment-message",
                      "x": "Maklumat bayaran ▸"
                    },
                    {
                      "c": "wf-minibtn",
                      "t": "dash.paid-draft-action",
                      "x": "Aligned primary: Semak & terbitkan / Sambung suntingan"
                    },
                    {
                      "c": "wf-minibtn",
                      "x": "Outlined secondary: Lihat bayaran"
                    }
                  ]
                },
                {
                  "c": "wf-cardrow",
                  "k": [
                    {
                      "c": "wf-phone-mini",
                      "x": "Paparan telefon"
                    },
                    {
                      "c": "wf-badge",
                      "x": "Tidak tersedia"
                    },
                    {
                      "c": "wf-alert",
                      "t": "dash.unavailable-note",
                      "x": "Sebab: Isu kandungan dilaporkan"
                    },
                    {
                      "c": "wf-minibtn",
                      "x": "Suntingan tamat: Mohon Suntingan primary · Hubungi sokongan outlined secondary"
                    },
                    {
                      "c": "wf-alert",
                      "t": "dash.support-dialog",
                      "x": "Dialog: Hubungi sokongan · Sila hubungi [email] atau WhatsApp [nombor]. · Tutup"
                    }
                  ]
                }
              ]
            },
            {
              "c": "wf-group",
              "k": [
                {
                  "c": "wf-eyebrow",
                  "x": "Apabila Akan datang dipilih"
                },
                {
                  "c": "wf-cardrow",
                  "k": [
                    {
                      "c": "wf-phone-mini",
                      "x": "Paparan telefon"
                    },
                    {
                      "c": "wf-strong",
                      "x": "Rumah terbuka keluarga"
                    },
                    {
                      "c": "wf-badge",
                      "x": "Diterbitkan"
                    },
                    {
                      "c": "wf-counters",
                      "t": "dash.rsvp-metrics",
                      "x": "30 tetamu hadir · 12 respons"
                    },
                    {
                      "c": "wf-cardrow-acts",
                      "x": "Lihat RSVP · Buka jemputan · Salin pautan"
                    }
                  ]
                }
              ]
            },
            {
              "c": "wf-group",
              "x": "Apabila Majlis lepas dipilih · Jemputan dan RSVP terdahulu"
            }
          ]
        },
        { "c": "wf-pills", "t": "dash.pagination", "x": "Sebelumnya · Halaman 1 daripada 2 · Seterusnya" },
        {
          "c": "wf-empty",
          "t": "dash.empty-state",
          "x": "Mulakan dengan satu jemputan · Pilih reka bentuk"
        }
      ]
    }
  },

  /* ------------------------------------------------------------ checkout */
  {
    id: "checkout-status",
    name: "Checkout status",
    route: "/dashboard/checkout/[orderId]",
    group: "Money",
    summary:
      "The owned payment-choice and status surface. A two-button modal offers Stripe and DuitNow QR; the dedicated QR page offers Bank and Touch ’n Go, requires Stripe-confirmed expiry before a bound Checkout can hand off to manual QR and blocks Stripe while an immutable manual review is pending, shows received/remaining states and stable rejected retry, opens the same editable paid draft after any first sufficient confirmed payment, never reveals a guest link until explicit owner publication, and keeps Published invitations as the only guest-accessible state.",
    sources: [
      "app/(dashboard)/dashboard/checkout/[orderId]/page.tsx",
      "app/(dashboard)/dashboard/checkout/[orderId]/CheckoutStatusClient.tsx",
      "app/api/orders/[orderId]/status/route.ts",
    ],
    screenshots: {},
    screenshotNote:
      "No screenshot — auth-gated, and reaching it requires a real Stripe session or DuitNow submission. Wireframe only.",
    wireframe: {
      c: "wf wf-checkout",
      k: [
        { c: "wf-panel", t: "checkout.panel", k: [
          { c: "wf-title wf-title-sm", x: "Bayaran jemputan · satu ringkasan jumlah dan resit" },
          { c: "wf-panel", t: "checkout.invitation-preview", x: "Jemputan anda · pratonton telefon di kanan · draf tersimpan milik pelanggan" },
          { c: "wf-methodchoice", t: "checkout.method-choice", k: [
            { c: "wf-btn wf-btn-primary wf-w-full", t: "checkout.stripe-choice", x: "Stripe" },
            { c: "wf-btn", t: "checkout.qr-choice", x: "DuitNow QR → halaman QR" },
            { c: "wf-input", t: "checkout.receipt-upload", x: "Resit wajib · PDF / JPEG / PNG / WebP · 5 MB" },
            { c: "wf-linkbox", t: "checkout.current-receipt", x: "Resit semasa · Muat turun / Gantikan" },
            { c: "wf-hint", t: "checkout.manual-payment-status", x: "Bayaran belum disahkan · Jemputan masih boleh disunting · Muat naik resit yang dibetulkan atau hubungi sokongan" },
            { c: "wf-hint", t: "checkout.payment-support-message", x: "Mesej sokongan bayaran · E-mel / WhatsApp / sandaran tanpa pautan" },
            { c: "wf-hint", t: "checkout.balance", x: "Harga RM 49 · Diterima RM 40 · Baki RM 9" },
            { c: "wf-slotchoice", t: "checkout.slot-choice", x: "◉ Bank  ○ Touch ’n Go" },
            { c: "wf-linkbox", t: "checkout.slot-detail", x: "1. Buat bayaran · Penerima · QR · Baki RM 9" },
            { c: "wf-input wf-w-full", t: "checkout.reference-field", x: "Rujukan pindahan (pilihan)" },
            { c: "wf-btn wf-btn-primary wf-w-full", t: "checkout.submit-reference", x: "2. Hantar resit bayaran · ruang berasingan" },
          ] },
        ] },
        { c: "wf-panel", k: [
          { c: "wf-bigemoji", t: "checkout.awaiting-review", x: "⏳ Menunggu Semakan Manual" },
          { c: "wf-hint", x: "Rujukan anda disemak secara manual oleh pasukan kami; jemputan boleh disunting, Stripe terkunci sehingga semakan selesai." },
        ] },
        { c: "wf-panel", k: [
          { c: "wf-bigemoji", t: "checkout.rejected-state", x: "❌ Rujukan Tidak Disahkan" },
          { c: "wf-hint", x: "Nota semakan kekal · Hantar rujukan baharu" },
          { c: "wf-btn", x: "Sunting Jemputan" },
          { c: "wf-hint", x: "Pilihan ulang cuba tidak memulihkan rekod ditolak melalui polling" },
        ] },
        { c: "wf-panel", k: [
          { c: "wf-bigemoji", x: "😕" },
          { c: "wf-title wf-title-sm", x: "Pembayaran Dibatalkan" },
          { c: "wf-btn wf-btn-primary wf-w-full", t: "checkout.cancel-editor-return", x: "Kembali ke Editor" },
        ] },
        { c: "wf-panel", k: [
          { c: "wf-bigemoji", x: "🎉" },
          { c: "wf-title wf-title-sm", t: "checkout.status-heading", x: "Bayaran diterima · Draf berbayar" },
          { c: "wf-hint", t: "checkout.paid-metadata", x: "Kaedah bayaran: DuitNow · 12 Ogos, 14:05" },
          { c: "wf-hint", t: "checkout.paid-draft-state", x: "Draf boleh disunting · Jemputan belum diterbitkan" },
          { c: "wf-btn wf-btn-primary wf-w-full", t: "checkout.paid-draft-edit-action", x: "Sunting Draf Berbayar" },
        ] },
        { c: "wf-panel", k: [
          { c: "wf-bigemoji", x: "🎉" },
          { c: "wf-title wf-title-sm", x: "Bayaran diterima · Jemputan diterbitkan" },
          { c: "wf-linkbox", t: "checkout.card-link-box", x: "kamyjemput.com/i/a1b2c3d4" },
        ] },
      ],
    },
  },

  /* --------------------------------------------------------------- admin */
  {
    "id": "admin-templates",
    "name": "Admin templates",
    "route": "/admin/templates",
    "group": "Admin",
    "summary": "Template management in the persistent Admin nav layout. Combined search, category and availability filters, inline price editing and confirmed deactivation.",
    "sources": [
      "app/(admin)/layout.tsx",
      "app/(admin)/AdminNav.tsx",
      "app/(admin)/admin/templates/page.tsx",
      "app/(admin)/admin/templates/TemplateRow.tsx",
      "app/api/admin/templates/[id]/route.ts"
    ],
    "screenshots": {},
    "screenshotNote": "Verified with isolated local administrator fixtures.",
    "wireframe": {
      "c": "wf wf-admin",
      "k": [
        {
          "c": "wf-adminnav",
          "t": "admin.nav",
          "k": [
            {
              "c": "wf-navlink",
              "x": "Ringkasan · Pesanan · Semakan bayaran"
            },
            {
              "c": "wf-navlink wf-navlink-on",
              "t": "admin.nav-item",
              "x": "Pengurusan template"
            },
            {
              "c": "wf-navlink",
              "x": "Tempahan khas · Tetapan · Dashboard pelanggan · Galeri template"
            }
          ]
        },
        {
          "c": "wf-h2",
          "x": "Pengurusan Template"
        },
        {
          "c": "wf-input",
          "x": "Cari nama / ID · Kategori · Status · Muat semula"
        },
        {
          "c": "wf-table",
          "t": "admin.template-table",
          "k": [
            {
              "c": "wf-thead",
              "t": "admin.table-header",
              "k": [
                {
                  "c": "wf-th",
                  "x": "Template"
                },
                {
                  "c": "wf-th",
                  "x": "Kategori"
                },
                {
                  "c": "wf-th",
                  "x": "Harga (RM)"
                },
                {
                  "c": "wf-th",
                  "x": "Status"
                }
              ]
            },
            {
              "c": "wf-tr",
              "t": "admin.template-row",
              "k": [
                {
                  "c": "wf-td",
                  "x": "Malay Wedding"
                },
                {
                  "c": "wf-td",
                  "x": "wedding"
                },
                {
                  "c": "wf-td",
                  "k": [
                    {
                      "c": "wf-input wf-input-xs",
                      "t": "admin.price-field",
                      "x": "49"
                    }
                  ]
                },
                {
                  "c": "wf-td",
                  "k": [
                    {
                      "c": "wf-toggle",
                      "t": "admin.active-toggle",
                      "x": "Aktif"
                    }
                  ]
                }
              ]
            },
            {
              "c": "wf-tr",
              "k": [
                {
                  "c": "wf-td",
                  "x": "Chinese Wedding"
                },
                {
                  "c": "wf-td",
                  "x": "wedding"
                },
                {
                  "c": "wf-td",
                  "k": [
                    {
                      "c": "wf-input wf-input-xs",
                      "x": "49"
                    }
                  ]
                },
                {
                  "c": "wf-td",
                  "k": [
                    {
                      "c": "wf-toggle wf-toggle-off",
                      "x": "Tidak aktif"
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  /* -------------------------------------------------- admin DuitNow payments */
  {
    "id": "admin-settings",
    "name": "Administrator settings",
    "route": "/admin/settings/qr, /admin/settings/support",
    "group": "Admin",
    "summary": "Horizontal administrator settings categories above the selected content. Bank and Touch ’n Go QR image configuration plus the support-contact form, live customer-message sample and immutable history.",
    "sources": [
      "app/(admin)/admin/settings/layout.tsx",
      "app/(admin)/admin/settings/qr/QrSettingsForm.tsx",
      "app/(admin)/admin/settings/SettingsNavigation.tsx",
      "app/(admin)/admin/settings/support/page.tsx",
      "app/(admin)/admin/settings/support/SupportSettingsForm.tsx"
    ],
    "screenshots": {},
    "screenshotNote": "Administrator-only settings; verified with local test accounts at desktop and mobile sizes.",
    "wireframe": {
      "c": "wf wf-admin",
      "k": [
        {
          "c": "wf-h2",
          "x": "Tetapan"
        },
        {
          "c": "wf-adminnav",
          "t": "settings.navigation",
          "x": "Bayaran QR · Hubungi sokongan"
        },
        {
          "c": "wf-panel",
          "t": "settings.content",
          "k": [
            {
              "c": "wf-slotform",
              "t": "pay.slot-form",
              "k": [
                {
                  "c": "wf-h2",
                  "x": "Bank"
                },
                {
                  "c": "wf-input",
                  "x": "Nama penerima · Nama bank · Arahan"
                },
                {
                  "c": "wf-input",
                  "t": "settings.qr-upload",
                  "x": "Muat naik imej QR · JPG / PNG / WebP · 5 MB"
                },
                {
                  "c": "wf-toggle",
                  "t": "pay.enabled-toggle",
                  "x": "Terima bayaran bank"
                },
                {
                  "c": "wf-btn",
                  "x": "Simpan perubahan"
                }
              ]
            },
            {
              "c": "wf-slotform",
              "t": "pay.tng-config",
              "x": "Touch ’n Go · Imej QR · Penerima · Terima bayaran · Simpan perubahan"
            },
            {
              "c": "wf-slotform",
              "t": "settings.support-form",
              "k": [
                {
                  "c": "wf-h2",
                  "x": "Maklumat sokongan bayaran"
                },
                {
                  "c": "wf-input",
                  "t": "settings.support-email",
                  "x": "E-mel sokongan (pilihan)"
                },
                {
                  "c": "wf-input",
                  "t": "settings.support-whatsapp",
                  "x": "WhatsApp (pilihan)"
                },
                {
                  "c": "wf-input",
                  "t": "settings.support-reason",
                  "x": "Sebab perubahan (wajib)"
                },
                {
                  "c": "wf-btn",
                  "x": "Simpan tetapan"
                }
              ]
            },
            {
              "c": "wf-panel",
              "t": "settings.support-sample",
              "x": "Contoh mesej pelanggan · berubah semasa menaip · e-mel / WhatsApp / sandaran"
            }
          ]
        },
        {
          "c": "wf-table",
          "t": "pay.slot-history",
          "k": [
            {
              "c": "wf-h2",
              "x": "Sejarah tetapan QR"
            },
            {
              "c": "wf-tr",
              "x": "Bank / Touch ’n Go · Sebelum / Selepas · Pentadbir · Tarikh"
            }
          ]
        },
        {
          "c": "wf-table",
          "t": "settings.support-history",
          "k": [
            {
              "c": "wf-h2",
              "x": "Sejarah tetapan sokongan"
            },
            {
              "c": "wf-tr",
              "x": "Sebelum / Selepas · Pentadbir · Masa · Sebab · Pulihkan"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "admin-payments",
    "name": "Admin DuitNow payments",
    "route": "/admin/payments",
    "group": "Admin",
    "summary": "Searchable newest-first payment-attempt table. Expand a row to inspect its current receipt, order/customer, totals and version history. Review decisions and file management are separate; legacy transfers appear only when present. QR configuration history lives in Settings.",
    "sources": [
      "app/(admin)/admin/page.tsx",
      "app/(admin)/admin/payments/page.tsx",
      "app/(admin)/admin/payments/ReviewControls.tsx",
      "app/(admin)/admin/payments/actions.ts"
    ],
    "screenshots": {},
    "screenshotNote": "Verified with local receipts, rejection and partial-payment fixtures.",
    "wireframe": {
      "c": "wf wf-admin",
      "k": [
        {
          "c": "wf-adminnav",
          "x": "Ringkasan · Pesanan · Semakan bayaran (aktif) · Pengurusan template · Tempahan khas · Tetapan"
        },
        {
          "c": "wf-h2",
          "x": "Semakan bayaran · Cari pelanggan / Pesanan / Rujukan · Status"
        },
        {
          "c": "wf-table",
          "t": "pay.review-queue",
          "k": [
            {
              "c": "wf-filtermeta",
              "t": "pay.review-filters",
              "x": "Cari pelanggan / ID pesanan / rujukan · Menunggu · Baki belum dibayar · Ditolak · Disahkan · Bayaran tambahan"
            },
            {
              "c": "wf-tr",
              "t": "pay.submission-row",
              "x": "Pelanggan · Bank DuitNow / Touch ’n Go · Harga / Diterima · Status · Dihantar"
            }
          ]
        },
        {
          "c": "wf-panel",
          "t": "pay.receipt-history",
          "k": [
            {
              "c": "wf-hint",
              "t": "pay.review-evidence",
              "x": "Bukti sebelum keputusan · Resit semasa · Harga / Diterima / Dikreditkan / Baki / Lebihan · Bukti peribadi"
            },
            {
              "c": "wf-reviewctl",
              "t": "pay.review-decision",
              "k": [
                {
                  "c": "wf-input",
                  "t": "pay.receipt-review",
                  "x": "Jumlah diterima RM · Sebab · Bukti peribadi untuk baki belum dibayar"
                },
                {
                  "c": "wf-btn wf-btn-primary",
                  "x": "Rekod jumlah diterima"
                },
                {
                  "c": "wf-btn",
                  "x": "Baki belum dibayar"
                },
                {
                  "c": "wf-btn",
                  "x": "Tolak resit"
                },
                {
                  "c": "wf-btn",
                  "t": "pay.receipt-files",
                  "x": "Pengurusan fail resit · Kuarantin / Buang / Cuba semula"
                }
              ]
            }
          ]
        },
        {
          "c": "wf-h2",
          "k": [
            {
              "c": "wf-hint",
              "x": "Pindahan terdahulu tanpa resit (hanya jika ada)"
            },
            {
              "c": "wf-tr",
              "k": [
                {
                  "c": "wf-td",
                  "x": "DuitNow Maybank · RM 49.00"
                },
                {
                  "c": "wf-td",
                  "x": "Rujukan FPX 240815123456"
                }
              ]
            },
            {
              "c": "wf-reviewctl",
              "t": "pay.review-controls",
              "x": "Tandakan untuk sejarah · Tolak rekod lama"
            }
          ]
        },
        {
          "c": "wf-table",
          "t": "pay.review-history",
          "k": [
            {
              "c": "wf-thead",
              "k": [
                {
                  "c": "wf-th",
                  "x": "Sejarah Semakan Bayaran"
                }
              ]
            },
            {
              "c": "wf-tr",
              "k": [
                {
                  "c": "wf-td",
                  "x": "Disahkan · FPX 240815123456 · oleh admin@…"
                }
              ]
            }
          ]
        }
      ]
    }
  },
  /* -------------------------------------------------- admin card detail */
  {
    "id": "admin-card-detail",
    "name": "Admin card detail",
    "route": "/admin/cards/[id]",
    "group": "Admin",
    "summary": "An invitation summary beside the phone render. Payment/activity, access/editing, history and permanent deletion expand on demand.",
    "sources": [
      "app/(admin)/admin/cards/[id]/page.tsx",
      "app/(admin)/admin/cards/[id]/TogglePublishButton.tsx",
      "app/api/admin/cards/[id]/publish/route.ts"
    ],
    "screenshots": {},
    "screenshotNote": "Wireframe shows disclosure contents for terminology; all disclosures start closed in the app.",
    "wireframe": {
      "c": "wf wf-admindetail",
      "k": [
        {
          "c": "wf-back",
          "x": "← Jemputan pelanggan"
        },
        {
          "c": "wf-title wf-title-sm",
          "x": "Sarah & Adam · pemilik@example.test"
        },
        {
          "c": "wf-kv",
          "t": "admindetail.lifecycle-state",
          "x": "Draf berbayar"
        },
        {
          "c": "wf-panel",
          "t": "admindetail.summary",
          "x": "Ringkasan: reka bentuk · bayaran · respons RSVP · tetamu hadir"
        },
        {
          "c": "wf-panel",
          "t": "admindetail.payment-disclosure",
          "k": [
            {
              "c": "wf-label",
              "x": "Bayaran & aktiviti ▸ (kandungan apabila dibuka)"
            },
            {
              "c": "wf-kv",
              "t": "admindetail.payment-confirmed-metadata",
              "x": "Bayaran disahkan pada · 7 Sep 2026 14:05"
            },
            {
              "c": "wf-kv",
              "t": "admindetail.payment-age",
              "x": "0 hari"
            },
            {
              "c": "wf-kv",
              "t": "admindetail.draft-activity",
              "x": "Aktiviti draf terakhir · 7 Sep 2026 14:12"
            }
          ]
        },
        {
          "c": "wf-panel",
          "t": "admindetail.access-disclosure",
          "k": [
            {
              "c": "wf-label",
              "x": "Akses & suntingan ▸"
            },
            {
              "c": "wf-panel",
              "t": "admindetail.availability-controls",
              "k": [
                {
                  "c": "wf-label",
                  "x": "Ketersediaan (pentadbir sahaja)"
                },
                {
                  "c": "wf-input",
                  "t": "admindetail.disable-reason-field",
                  "x": "Sebab dinyahterbitkan"
                },
                {
                  "c": "wf-btn wf-btn-primary",
                  "x": "Nyahterbitkan Jemputan"
                },
                {
                  "c": "wf-btn",
                  "t": "admindetail.restore-control",
                  "x": "Pulihkan Jemputan"
                },
                {
                  "c": "wf-empty",
                  "t": "admindetail.unpaid-block",
                  "x": "Pesanan belum dibayar"
                }
              ]
            },
            {
              "c": "wf-panel",
              "t": "admindetail.edit-window",
              "k": [
                {
                  "c": "wf-label",
                  "x": "Suntingan selepas terbitan (pentadbir sahaja)"
                },
                {
                  "c": "wf-kv",
                  "t": "admindetail.edit-window-deadline",
                  "x": "Tamat 14 Sep 2026 14:05 · 7 hari"
                },
                {
                  "c": "wf-input",
                  "t": "admindetail.edit-window-reason",
                  "x": "Sebab buka semula suntingan"
                },
                {
                  "c": "wf-btn wf-btn-primary",
                  "t": "admindetail.grant-edit-window",
                  "x": "Buka suntingan terhad"
                }
              ]
            }
          ]
        },
        {
          "c": "wf-panel",
          "t": "admindetail.controlled-replacement",
          "k": [
            {
              "c": "wf-label",
              "x": "Penggantian terkawal (pentadbir sahaja)"
            },
            {
              "c": "wf-kv",
              "x": "Sebab · pembaikan aset dan kandungan"
            },
            {
              "c": "wf-kv",
              "x": "Status · Draf penggantian / Potong ganti selesai"
            },
            {
              "c": "wf-alert",
              "x": "Pemilik boleh menyunting draf · hanya pentadbir boleh melengkapkan potong ganti"
            },
            {
              "c": "wf-input",
              "x": "Sebab penggantian"
            },
            {
              "c": "wf-btn wf-btn-primary",
              "x": "Beri penggantian / Lengkapkan potong ganti"
            }
          ]
        },
        {
          "c": "wf-panel",
          "t": "admindetail.history-disclosure",
          "k": [
            {
              "c": "wf-label",
              "x": "Sejarah tindakan ▸"
            },
            {
              "c": "wf-table",
              "t": "admindetail.action-record",
              "k": [
                {
                  "c": "wf-thead",
                  "k": [
                    {
                      "c": "wf-th",
                      "x": "Tindakan"
                    },
                    {
                      "c": "wf-th",
                      "x": "Oleh"
                    },
                    {
                      "c": "wf-th",
                      "x": "Sebab"
                    },
                    {
                      "c": "wf-th",
                      "x": "Masa"
                    }
                  ]
                },
                {
                  "c": "wf-tr",
                  "k": [
                    {
                      "c": "wf-td",
                      "x": "Dinyahterbitkan"
                    },
                    {
                      "c": "wf-td",
                      "x": "admin@kamyjemput.my"
                    },
                    {
                      "c": "wf-td",
                      "x": "Isu kandungan"
                    },
                    {
                      "c": "wf-td",
                      "x": "26 Ogos 2026 14:05"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "c": "wf-panel",
          "t": "admindetail.delete-disclosure",
          "x": "Padam jemputan ▸ Tindakan kekal · Buka dialog pengesahan"
        }
      ]
    }
  },
]

window.KAMY_GLOSSARY.plates.push({
  "id": "admin-invitations",
  "screenshotNote": "Wireframe reconstruction of the isolated development app.",
  "name": "Customer invitations",
  "route": "/admin/cards",
  "group": "Admin",
  "summary": "Searchable invitation list; each row leads to a focused detail page.",
  "sources": [
    "app/(admin)/admin/cards/page.tsx",
    "app/(admin)/AdminTable.tsx"
  ],
  "screenshots": {},
  "wireframe": {
    "c": "wf wf-admin",
    "k": [
      {
        "c": "wf-title wf-title-sm",
        "x": "Jemputan pelanggan"
      },
      {
        "c": "wf-input",
        "x": "Cari majlis, pelanggan, e-mel atau pautan… · Status"
      },
      {
        "c": "wf-table",
        "t": "admin.invitations",
        "x": "Jemputan | Pelanggan | Status | Buka butiran →"
      }
    ]
  }
});

window.KAMY_GLOSSARY.plates.push({
  id: "rsvp-dashboard", name: "RSVP dashboard", route: "/dashboard/cards/[id]/rsvp", group: "Build",
  summary: "Shared Kamy cream and deep-plum styling, attendance totals and expandable owner-only guest responses.",
  sources: ["app/(dashboard)/dashboard/cards/[id]/rsvp/page.tsx", "app/(dashboard)/layout.tsx", "components/CopyLinkButton.tsx"],
  screenshots: {}, screenshotNote: "Verified in the isolated app using the customer's lifecycle examples.",
  wireframe: { c: "wf wf-dash", k: [
    { c: "wf-dashhead", t: "rsvp.header", x: "← Jemputan saya · Respons RSVP · Sara & Amin" },
    { c: "wf-pills", t: "rsvp.share", x: "Salin pautan · Buka jemputan ↗" },
    { c: "wf-panel", t: "rsvp.summary", x: "5 Jangkaan tetamu (termasuk tambahan) · 2 Respons hadir · 1 Respons tidak hadir" },
    { c: "wf-cardlist", t: "rsvp.list", k: [
      { c: "wf-title wf-title-sm", x: "Senarai respons (3) · Terbaharu dahulu" },
      { c: "wf-cardrow", x: "Tetamu Contoh 1 · 8 Sep 2026, 2:26 PTG · Hadir · 2 tetamu ▾" },
      { c: "wf-panel", t: "rsvp.details", x: "Maklumat hubungan: Tidak diberikan · Ucapan: Tahniah! Kami akan hadir." },
      { c: "wf-cardrow", x: "Tetamu Contoh 2 · Hadir · 3 tetamu ▸" },
      { c: "wf-cardrow", x: "Tetamu Contoh 3 · Tidak hadir ▸" },
      { c: "wf-empty", x: "Jika kosong: Belum ada respons · Kongsi pautan jemputan" }
    ] }
  ] }
});
