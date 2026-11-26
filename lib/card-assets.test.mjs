import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildCardAssetReference,
  collectCardAssetPaths,
  isAllowedCardImageReference,
  isAllowedPublicStaticAssetReference,
  normalizeCardAssetReference,
  normalizeCardAssetRoutePath,
  resolveCardAssetPath,
  resolveCardDataAssetUrls,
} from "./card-assets.ts"

const origin = "https://example.supabase.co"
const cardId = "11111111-1111-4111-8111-111111111111"
const otherCardId = "22222222-2222-4222-8222-222222222222"
const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const otherUserId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const context = { cardId, userId, knownStorageOrigin: origin }
const privateStorageMigration = readFileSync(
  new URL("../supabase/migrations/036_private_card_assets.sql", import.meta.url),
  "utf8",
)
const scopedUpgradeMigration = readFileSync(
  new URL("../supabase/migrations/037_scope_card_assets_select_policy.sql", import.meta.url),
  "utf8",
)
const paymentQrMigration = readFileSync(
  new URL("../supabase/migrations/030_payment_qr_settings.sql", import.meta.url),
  "utf8",
)
const receiptsMigration = readFileSync(
  new URL("../supabase/migrations/029_manual_payment_receipts.sql", import.meta.url),
  "utf8",
)
const evidenceMigration = readFileSync(
  new URL("../supabase/migrations/031_manual_payment_review.sql", import.meta.url),
  "utf8",
)

test("new references are stable app routes with safe object paths", () => {
  const reference = buildCardAssetReference(cardId, "landing", "photo.png")
  assert.equal(reference, `/api/card-assets/${cardId}/landing/photo.png`)
  assert.deepEqual(resolveCardAssetPath(reference, context), {
    objectPath: `${cardId}/landing/photo.png`,
    relativePath: "landing/photo.png",
  })
  assert.equal(normalizeCardAssetReference(reference, context), reference)
})

test("old known-origin public URLs normalize without fetching or rewriting data", () => {
  const oldV2 = `${origin}/storage/v1/object/public/card-assets/${cardId}/gallery/old.webp`
  const oldCover = `${origin}/storage/v1/object/public/card-assets/covers/${userId}/cover.jpg`

  assert.deepEqual(resolveCardAssetPath(oldV2, context), {
    objectPath: `${cardId}/gallery/old.webp`,
    relativePath: "gallery/old.webp",
  })
  assert.deepEqual(resolveCardAssetPath(oldCover, context), {
    objectPath: `covers/${userId}/cover.jpg`,
    relativePath: `covers/${userId}/cover.jpg`,
  })
  assert.equal(
    normalizeCardAssetReference(oldV2, context),
    `/api/card-assets/${cardId}/gallery/old.webp`,
  )
})

test("unknown origins, cross-card refs, traversal and query variants fail closed", () => {
  const attempts = [
    "https://attacker.example/image.png",
    `${origin}/storage/v1/object/public/payment-receipts/${cardId}/receipt.png`,
    `${origin}/storage/v1/object/public/card-assets/${otherCardId}/landing/photo.png`,
    `${origin}/storage/v1/object/public/card-assets/${cardId}/../other/photo.png`,
    `${origin}/storage/v1/object/public/card-assets/${cardId}/landing/photo.png?download=1`,
    `/api/card-assets/${otherCardId}/landing/photo.png`,
    `/api/card-assets/${cardId}/landing/%2e%2e.png`,
    `/api/card-assets/${cardId}/landing/%252e%252e.png`,
  ]
  for (const value of attempts) {
    assert.equal(resolveCardAssetPath(value, context), null, value)
  }
  assert.equal(
    normalizeCardAssetRoutePath(cardId, ["landing", "../secret.png"], userId),
    null,
  )
  assert.equal(
    resolveCardAssetPath(
      `${origin}/storage/v1/object/public/card-assets/covers/${otherUserId}/cover.jpg`,
      context,
    ),
    null,
  )
})

test("renderer normalization covers v2 sections, legacy gallery, and CSS backgrounds", () => {
  const stable = buildCardAssetReference(cardId, "landing", "stable.png")
  const legacy = `${origin}/storage/v1/object/public/card-assets/${cardId}/gallery/legacy.png`
  const data = {
    templateId: "general-wedding",
    theme: {
      background: { kind: "image", value: `url('${legacy}') center/cover` },
    },
    sections: [
      {
        type: "landing",
        data: { headline: "A & B", coverPhotoUrl: stable },
      },
      {
        type: "gallery",
        data: { blocks: [{ photos: [legacy, "https://attacker.example/x.png"] }] },
      },
      {
        type: "love_story",
        data: { moments: [{ photoUrl: stable }] },
      },
    ],
  }

  const rendered = resolveCardDataAssetUrls(data, context)
  assert.equal(rendered.sections[0].data.coverPhotoUrl, stable)
  assert.equal(rendered.sections[1].data.blocks[0].photos[0], `/api/card-assets/${cardId}/gallery/legacy.png`)
  assert.equal(rendered.sections[1].data.blocks[0].photos[1], "")
  assert.equal(rendered.sections[2].data.moments[0].photoUrl, stable)
  assert.match(rendered.theme.background.value, /\/api\/card-assets\/.*gallery\/legacy\.png/)
})

test("legacy heroImageUrl is normalized consistently for rendering and frozen membership", () => {
  const legacyHero = buildCardAssetReference(cardId, "landing", "legacy-hero.png")
  const currentCover = buildCardAssetReference(cardId, "landing", "current-cover.png")
  const legacyOnly = {
    templateId: "legacy-v2",
    theme: { background: { kind: "solid", value: "#fff" } },
    sections: [{
      type: "landing",
      variant: "photo_hero",
      data: { headline: "Old record", heroImageUrl: legacyHero },
    }],
  }
  const currentWins = {
    ...legacyOnly,
    sections: [{
      ...legacyOnly.sections[0],
      data: {
        headline: "Current record",
        coverPhotoUrl: currentCover,
        heroImageUrl: legacyHero,
      },
    }],
  }

  assert.equal(
    resolveCardDataAssetUrls(legacyOnly, context).sections[0].data.coverPhotoUrl,
    legacyHero,
  )
  assert.deepEqual([...collectCardAssetPaths(legacyOnly, context)], [
    `${cardId}/landing/legacy-hero.png`,
  ])
  assert.equal(
    resolveCardDataAssetUrls(currentWins, context).sections[0].data.coverPhotoUrl,
    currentCover,
  )
  assert.deepEqual([...collectCardAssetPaths(currentWins, context)], [
    `${cardId}/landing/current-cover.png`,
  ])

  const unsupportedVariant = {
    templateId: "legacy-v2",
    theme: { background: { kind: "solid", value: "#fff" } },
    sections: [{
      type: "landing",
      variant: "poster_luxe",
      data: { headline: "Outside compatibility scope", heroImageUrl: legacyHero },
    }],
  }
  assert.equal(
    resolveCardDataAssetUrls(unsupportedVariant, context).sections[0].data.coverPhotoUrl,
    "",
  )
  assert.deepEqual([...collectCardAssetPaths(unsupportedVariant, context)], [])
})

test("public template/static assets survive customer-asset mapping without becoming customer references", () => {
  const templateImage = "/templates/malay-wedding/thumb.jpg"
  const data = {
    templateId: "malay-wedding-v2",
    theme: {
      background: { kind: "image", value: `url('${templateImage}') center/cover` },
    },
    sections: [{
      type: "landing",
      data: { headline: "Template", coverPhotoUrl: templateImage },
    }],
  }
  const rendered = resolveCardDataAssetUrls(data, context)
  assert.equal(rendered.sections[0].data.coverPhotoUrl, templateImage)
  assert.match(rendered.theme.background.value, /url\("\/templates\/malay-wedding\/thumb\.jpg"\)/)
  assert.deepEqual([...collectCardAssetPaths(data, context)], [])
  assert.equal(isAllowedPublicStaticAssetReference(templateImage), true)
  assert.equal(isAllowedPublicStaticAssetReference("/templates/../private.png"), false)
})

test("image-reference validator accepts stable and known legacy references only", () => {
  const stable = buildCardAssetReference(cardId, "landing", "photo.png")
  const legacy = `${origin}/storage/v1/object/public/card-assets/${cardId}/gallery/old.webp`
  assert.equal(isAllowedCardImageReference(stable), true)
  assert.equal(isAllowedCardImageReference(legacy, { knownStorageOrigin: origin }), true)
  assert.equal(isAllowedCardImageReference("relative/photo.png", { knownStorageOrigin: origin }), false)
  assert.equal(isAllowedCardImageReference("https://attacker.example/photo.png", { knownStorageOrigin: origin }), false)
})

test("guest reference set is limited to the frozen snapshot's image fields", () => {
  const referenced = buildCardAssetReference(cardId, "landing", "referenced.png")
  const orphan = buildCardAssetReference(cardId, "gallery", "orphan.png")
  const old = `${origin}/storage/v1/object/public/card-assets/covers/${userId}/old.jpg`
  const data = {
    templateId: "legacy",
    coverPhotoUrl: referenced,
    galleryUrls: [old],
    unrelated: orphan,
  }

  const paths = collectCardAssetPaths(data, context)
  assert.deepEqual([...paths].sort(), [
    `${cardId}/landing/referenced.png`,
    `covers/${userId}/old.jpg`,
  ].sort())
})

test("card-assets select isolation preserves unrelated bucket policy scope", () => {
  const policy = privateStorageMigration.match(
    /create policy "card-assets no browser select"[\s\S]*?using \(([^;]+)\);/i,
  )?.[1]
  assert.ok(policy)
  assert.match(policy, /bucket_id\s*<>\s*'card-assets'/i)
  assert.doesNotMatch(policy, /using\s*\(\s*false\s*\)/i)

  // The additional restrictive predicate must be neutral for all other
  // buckets; their own permissive/restrictive policies remain authoritative.
  const cardAssetSelectRestriction = (bucketId) => bucketId !== "card-assets"
  assert.equal(cardAssetSelectRestriction("card-assets"), false)
  for (const bucket of [
    "payment-qr",
    "payment-receipts",
    "payment-review-evidence",
    "duitnow-qr",
  ]) {
    assert.equal(cardAssetSelectRestriction(bucket), true)
  }
  assert.match(
    paymentQrMigration,
    /create policy payment_qr_no_browser_access[\s\S]*?using \(bucket_id <> 'payment-qr'\)/i,
  )
  assert.match(
    receiptsMigration,
    /create policy receipt_storage_private[\s\S]*?using\s*\(bucket_id\s*<>\s*'payment-receipts'\)/i,
  )
  assert.match(
    evidenceMigration,
    /create policy payment_review_evidence_no_browser_access[\s\S]*?using\s*\(bucket_id\s*<>\s*'payment-review-evidence'\)/i,
  )
})

test("fresh 036 plus additive 037 migration sequence stays limited to one policy", () => {
  assert.match(privateStorageMigration, /using \(bucket_id\s*<>\s*'card-assets'\)/i)
  assert.equal((scopedUpgradeMigration.match(/drop policy if exists/gi) ?? []).length, 1)
  assert.equal((scopedUpgradeMigration.match(/create policy/gi) ?? []).length, 1)
  assert.match(scopedUpgradeMigration, /using \(bucket_id\s*<>\s*'card-assets'\)/i)
  assert.doesNotMatch(scopedUpgradeMigration, /on storage\.buckets/i)
})
