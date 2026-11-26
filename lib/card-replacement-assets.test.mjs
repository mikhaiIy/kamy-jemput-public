import assert from "node:assert/strict"
import test from "node:test"

import {
  buildReplacementAssetPlan,
  isReplacementDraftAssetSafe,
  remapReplacementCardData,
} from "./card-replacement-assets.ts"
import { buildCardAssetReference } from "./card-assets.ts"

const sourceCardId = "11111111-1111-4111-8111-111111111111"
const targetCardId = "22222222-2222-4222-8222-222222222222"
const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

const context = {
  sourceCardId,
  sourceUserId: ownerId,
  targetCardId,
  targetUserId: ownerId,
  knownStorageOrigin: "https://example.supabase.co",
}

test("replacement remap keeps each publication image inside target card scope", () => {
  const sourceLanding = buildCardAssetReference(sourceCardId, "landing", "hero.png")
  const sourceGallery = buildCardAssetReference(sourceCardId, "gallery", "one.png")
  const sourceLegacy = "https://example.supabase.co/storage/v1/object/public/card-assets/covers/"
    + `${ownerId}/legacy.jpg`
  const source = {
    templateId: "malay-wedding-v2",
    theme: {
      palette: "plum_gold",
      fonts: { display: "serif", body: "sans", script: "script" },
      animation: "none",
      background: { kind: "image", value: `url('${sourceGallery}') center/cover` },
    },
    sections: [
      { type: "landing", variant: "photo_hero", enabled: true, order: 0, data: { headline: "Event", coverPhotoUrl: sourceLanding } },
      { type: "gallery", enabled: true, order: 1, data: { blocks: [{ photos: [sourceGallery] }] } },
      { type: "child_info", enabled: true, order: 2, data: { name: "Child", dob: "", photoUrl: sourceLegacy } },
    ],
  }

  const target = remapReplacementCardData(source, context)
  const plan = buildReplacementAssetPlan(source, context)
  assert.equal(plan.length, 3)
  assert.deepEqual(
    plan.map((item) => item.targetObjectPath).sort(),
    [
      `${targetCardId}/gallery/one.png`,
      `${targetCardId}/landing/hero.png`,
      `${targetCardId}/legacy_covers/legacy.jpg`,
    ].sort(),
  )
  assert.equal(target.sections[0].data.coverPhotoUrl, `/api/card-assets/${targetCardId}/landing/hero.png`)
  assert.equal(target.sections[1].data.blocks[0].photos[0], `/api/card-assets/${targetCardId}/gallery/one.png`)
  assert.equal(target.sections[2].data.photoUrl, `/api/card-assets/${targetCardId}/legacy_covers/legacy.jpg`)
  assert.match(target.theme.background.value, new RegExp(`/api/card-assets/${targetCardId}/gallery/one\\.png`))
  assert.ok(plan.every((item) => item.sourceObjectPath.startsWith(`${sourceCardId}/`) || item.sourceObjectPath.startsWith("covers/")))
})

test("unknown image URLs fail closed and are never copied", () => {
  const source = {
    templateId: "malay-wedding-v2",
    theme: {
      palette: "plum_gold",
      fonts: { display: "serif", body: "sans", script: "script" },
      animation: "none",
      background: { kind: "image", value: "url(https://attacker.example/nope.png)" },
    },
    sections: [{ type: "landing", enabled: true, order: 0, data: { headline: "Event", coverPhotoUrl: "https://attacker.example/nope.png" } }],
  }
  const target = remapReplacementCardData(source, context)
  assert.equal(target.sections[0].data.coverPhotoUrl, "")
  assert.equal(target.theme.background.value, "")
  assert.deepEqual(buildReplacementAssetPlan(source, context), [])
})

test("cutover asset validation accepts target uploads but rejects predecessor references", () => {
  const targetImage = buildCardAssetReference(targetCardId, "gallery", "owner-upload.png")
  const safe = {
    templateId: "malay-wedding-v2",
    theme: { palette: "plum_gold", fonts: { display: "serif", body: "sans", script: "script" }, animation: "none", background: { kind: "solid", value: "#fff" } },
    sections: [{ type: "gallery", enabled: true, order: 0, data: { blocks: [{ layout: "single", photos: [targetImage] }] } }],
  }
  const unsafe = structuredClone(safe)
  unsafe.sections[0].data.blocks[0].photos[0] = buildCardAssetReference(sourceCardId, "gallery", "old.png")
  assert.equal(isReplacementDraftAssetSafe(safe, { cardId: targetCardId, userId: ownerId, knownStorageOrigin: "https://example.supabase.co" }), true)
  assert.equal(isReplacementDraftAssetSafe(unsafe, { cardId: targetCardId, userId: ownerId, knownStorageOrigin: "https://example.supabase.co" }), false)
})
