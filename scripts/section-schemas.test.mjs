import assert from "node:assert/strict"
import test from "node:test"

const origin = "https://example.supabase.co"
const cardId = "11111111-1111-4111-8111-111111111111"
const stable = `/api/card-assets/${cardId}/landing/uploaded.png`
const legacy = `${origin}/storage/v1/object/public/card-assets/${cardId}/gallery/old.webp`

process.env.NEXT_PUBLIC_SUPABASE_URL = origin

const [{ sectionRegistry }, cardAssets, { THEME_PRESETS }] = await Promise.all([
  import("@/lib/sections/registry"),
  import("@/lib/card-assets"),
  import("@/lib/themes/presets"),
])

const baseLanding = {
  headline: "A & B",
  subhead: "",
  tagline: "",
  eventDate: "",
}

test("registry image schemas accept uploaded, legacy, and public static references", () => {
  assert.equal(
    sectionRegistry.landing.schema.safeParse({
      ...baseLanding,
      coverPhotoUrl: stable,
    }).success,
    true,
  )
  assert.equal(
    sectionRegistry.child_info.schema.safeParse({
      name: "Adam",
      dob: "",
      photoUrl: legacy,
    }).success,
    true,
  )
  assert.equal(
    sectionRegistry.corporate_speakers.schema.safeParse({
      speakers: [{ name: "A", role: "B", photoUrl: stable }],
    }).success,
    true,
  )
  assert.equal(
    sectionRegistry.gallery.schema.safeParse({
      blocks: [{ layout: "single", photos: ["/templates/malay-wedding/thumb.jpg"] }],
    }).success,
    true,
  )
  assert.equal(
    sectionRegistry.love_story.schema.safeParse({
      moments: [{ label: "Met", text: "Hello", photoUrl: stable }],
    }).success,
    true,
  )
})

test("registry image schemas reject arbitrary relative, traversal, and remote references", () => {
  const invalid = [
    "relative/photo.png",
    "/uploads/photo.png",
    "/api/card-assets/not-a-card/landing/photo.png",
    `/api/card-assets/${cardId}/landing/%2e%2e.png`,
    "https://attacker.example/photo.png",
  ]
  for (const value of invalid) {
    assert.equal(
      sectionRegistry.landing.schema.safeParse({
        ...baseLanding,
        coverPhotoUrl: value,
      }).success,
      false,
      value,
    )
  }
})

test("non-image URL fields keep absolute-URL validation", () => {
  assert.equal(
    sectionRegistry.map.schema.safeParse({
      address: "Venue",
      wazeUrl: "/relative-map-link",
      gmapsUrl: "",
      grabUrl: "",
    }).success,
    false,
  )
  assert.equal(
    cardAssets.isAllowedCardImageReference(legacy, { knownStorageOrigin: origin }),
    true,
  )
  assert.equal(
    cardAssets.isAllowedCardImageReference("/relative/photo.png", {
      knownStorageOrigin: origin,
    }),
    false,
  )
})

test("built-in theme and Section defaults do not depend on protected customer URLs", () => {
  for (const [presetId, preset] of Object.entries(THEME_PRESETS)) {
    assert.doesNotMatch(preset.background.value, /url\(/i, presetId)
  }

  function checkDefaults(value, path = "defaultData") {
    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) checkDefaults(item, `${path}[${index}]`)
      return
    }
    if (!value || typeof value !== "object") return
    for (const [key, child] of Object.entries(value)) {
      if (/^(?:coverPhotoUrl|photoUrl|photos|galleryUrls)$/i.test(key)) {
        const values = Array.isArray(child) ? child : [child]
        for (const image of values) {
          assert.equal(
            cardAssets.isAllowedCardImageReference(image),
            true,
            `${path}.${key}`,
          )
        }
      } else {
        checkDefaults(child, `${path}.${key}`)
      }
    }
  }

  for (const [type, module] of Object.entries(sectionRegistry)) {
    checkDefaults(module.defaultData, `${type}.defaultData`)
  }
})
