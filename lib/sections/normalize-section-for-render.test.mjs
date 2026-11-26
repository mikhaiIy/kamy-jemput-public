import assert from "node:assert/strict"
import test from "node:test"

import {
  getLandingImageReference,
  normalizeSectionForRender,
} from "./normalize-section-for-render.ts"

const affectedVariants = ["photo_hero", "minimalist", "kinetic_hero"]

test("old Landing records provide meaningful content to all three affected variants", () => {
  for (const variant of affectedVariants) {
    const normalized = normalizeSectionForRender({
      type: "landing",
      variant,
      version: 1,
      order: 0,
      enabled: true,
      data: {
        eventTitle: "Li & Chen",
        hostNames: "Keluarga Li & Keluarga Chen",
        heroImageUrl: "https://example.com/couple.jpg",
        eyebrow: "Wedding Invitation",
        openButtonLabel: "Open Invitation",
      },
    })

    assert.equal(normalized.data.headline, "Li & Chen", variant)
    assert.equal(
      normalized.data.subhead,
      "Keluarga Li & Keluarga Chen",
      variant
    )
    assert.equal(
      normalized.data.coverPhotoUrl,
      "https://example.com/couple.jpg",
      variant
    )
    assert.equal(normalized.data.tagline, "Wedding Invitation", variant)
  }
})

test("valid current Landing fields are unchanged", () => {
  const current = {
    type: "landing",
    variant: "photo_hero",
    version: 1,
    order: 0,
    enabled: true,
    data: {
      headline: "Current headline",
      subhead: "Current subhead",
      coverPhotoUrl: "https://example.com/current.jpg",
      tagline: "Current tagline",
      eventDate: "2026-12-26",
      eventTitle: "Old headline",
      hostNames: "Old subhead",
      heroImageUrl: "https://example.com/old.jpg",
      eyebrow: "Old tagline",
    },
  }

  const normalized = normalizeSectionForRender(current)

  assert.strictEqual(normalized, current)
  assert.deepEqual(normalized.data, current.data)
})

test("the current Landing image field takes precedence over the legacy alias", () => {
  const data = {
    coverPhotoUrl: "https://example.com/current.jpg",
    heroImageUrl: "https://example.com/old.jpg",
  }
  assert.equal(getLandingImageReference(data), data.coverPhotoUrl)
  assert.equal(
    getLandingImageReference({ coverPhotoUrl: "", heroImageUrl: data.heroImageUrl }),
    "",
  )
})

test("other Landing variants are outside the compatibility repair", () => {
  const section = {
    type: "landing",
    variant: "poster_luxe",
    version: 1,
    order: 0,
    enabled: true,
    data: { eventTitle: "Li & Chen", heroImageUrl: "https://example.com/old.jpg" },
  }

  assert.strictEqual(normalizeSectionForRender(section), section)
  assert.equal(normalizeSectionForRender(section).data.coverPhotoUrl, undefined)
})
