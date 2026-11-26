import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test, { before } from "node:test"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"

import {
  buildCardAssetReference,
} from "../lib/card-assets.ts"
import {
  assertLocalSupabaseTarget,
  readAuthorizedLocalEnv,
  requireLoopbackAppUrl,
} from "./local-supabase-target.mjs"

const PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
)
const OWNER_EMAIL = "kamy@gmail.com"
const OWNER_PASSWORD = "123"
const ADMIN_EMAIL = "kamy.admin@gmail.com"
const ADMIN_PASSWORD = "123"

const localEnv = readAuthorizedLocalEnv()
const supabaseUrl = localEnv.NEXT_PUBLIC_SUPABASE_URL
const anonKey = localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = localEnv.SUPABASE_SERVICE_ROLE_KEY
const appUrl = requireLoopbackAppUrl("PRIVATE_ASSET_TEST_APP_URL")

assert.ok(supabaseUrl && anonKey && serviceRoleKey && appUrl, "local env is incomplete")

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const anon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const fixture = {}

async function signIn(email, password) {
  assertLocalSupabaseTarget()
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  assert.ifError(error)
  assert.ok(data.session, `no session for ${email}`)
  return { client, session: data.session }
}

async function cookieHeader(email, password) {
  const { session } = await signIn(email, password)
  const values = new Map()
  const serverClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => [...values].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const cookie of cookies) values.set(cookie.name, cookie.value)
      },
    },
  })
  const { error } = await serverClient.auth.setSession(session)
  assert.ifError(error)
  assert.ok(values.size > 0, `SSR auth cookies were not created for ${email}`)
  return [...values]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ")
}

async function rpc(name, params) {
  assertLocalSupabaseTarget()
  const { data, error } = await admin.rpc(name, params)
  assert.ifError(error)
  return data
}

async function makeDraft(ownerId) {
  const result = await rpc("create_draft_order_and_card", {
    p_template_id: "malay-wedding-v2",
    p_owner: ownerId,
    p_slug: `private-assets-${randomUUID()}`,
  })
  assert.ok(result?.cardId && result?.orderId)
  return result
}

async function uploadObject(path, client = admin) {
  assertLocalSupabaseTarget()
  const { error } = await client.storage.from("card-assets").upload(
    path,
    new Blob([PNG_BYTES], { type: "image/png" }),
    { upsert: false, contentType: "image/png", cacheControl: "no-store" },
  )
  assert.ifError(error)
}

async function getCard(cardId) {
  assertLocalSupabaseTarget()
  const { data, error } = await admin
    .from("cards")
    .select("id, user_id, order_id, slug, custom_data_draft, draft_version")
    .eq("id", cardId)
    .single()
  assert.ifError(error)
  return data
}

async function requestAsset(reference, cookie) {
  assertLocalSupabaseTarget()
  return fetch(new URL(reference, appUrl), {
    headers: cookie ? { cookie } : undefined,
    redirect: "manual",
  })
}

before(async () => {
  assertLocalSupabaseTarget()
  const [{ data: owner }, { data: administrator }] = await Promise.all([
    admin.from("users").select("id").eq("email", OWNER_EMAIL).single(),
    admin.from("users").select("id").eq("email", ADMIN_EMAIL).single(),
  ])
  assert.ok(owner?.id)
  assert.ok(administrator?.id)

  const strangerEmail = `private-assets-stranger-${randomUUID()}@example.test`
  const { data: stranger, error: strangerError } = await admin.auth.admin.createUser({
    email: strangerEmail,
    password: "stranger-password-123",
    email_confirm: true,
  })
  assert.ifError(strangerError)
  assert.ok(stranger.user)

  const published = await makeDraft(owner.id)
  const card = await getCard(published.cardId)
  const draft = JSON.parse(JSON.stringify(card.custom_data_draft))
  const stablePath = `${published.cardId}/gallery/referenced-${randomUUID()}.png`
  const legacyHeroPath = `${published.cardId}/landing/legacy-hero-${randomUUID()}.png`
  const legacyPath = `${published.cardId}/gallery/legacy-${randomUUID()}.png`
  const orphanPath = `${published.cardId}/gallery/orphan-${randomUUID()}.png`
  const legacyCoverPath = `covers/${owner.id}/legacy-cover-${randomUUID()}.png`
  const legacyOrphanPath = `covers/${owner.id}/legacy-orphan-${randomUUID()}.png`
  await Promise.all([
    uploadObject(stablePath),
    uploadObject(legacyHeroPath),
    uploadObject(legacyPath),
    uploadObject(orphanPath),
    uploadObject(legacyCoverPath),
    uploadObject(legacyOrphanPath),
  ])

  const landing = draft.sections.find((section) => section.type === "landing")
  assert.ok(landing)
  // Concrete pre-v2 fixture: the old field name is the only Landing image
  // field in the frozen snapshot. The application must normalize it for both
  // rendering and protected membership checks without rewriting the snapshot.
  const legacyHeroUrl = `${supabaseUrl}/storage/v1/object/public/card-assets/${legacyHeroPath}`
  delete landing.data.coverPhotoUrl
  landing.data.heroImageUrl = legacyHeroUrl
  const legacyCoverUrl = `${supabaseUrl}/storage/v1/object/public/card-assets/${legacyCoverPath}`
  draft.sections.push({
    type: "child_info",
    variant: "centered",
    enabled: true,
    order: 998,
    data: {
      name: "Legacy asset fixture",
      dob: "",
      parents: "",
      photoUrl: legacyCoverUrl,
    },
  })
  draft.sections.push({
    type: "gallery",
    variant: "soft_grid",
    enabled: true,
    order: 999,
    data: {
      title: "Gallery",
      intro: "",
      blocks: [{
        layout: "single",
        photos: [
          buildCardAssetReference(published.cardId, "gallery", stablePath.split("/").at(-1)),
          `${supabaseUrl}/storage/v1/object/public/card-assets/${legacyPath}`,
        ],
      }],
    },
  })
  const saved = await rpc("save_card_draft", {
    p_card_id: published.cardId,
    p_owner: owner.id,
    p_draft: draft,
    p_expected_draft_version: card.draft_version,
  })
  assert.ok(saved?.draftVersion)

  const stripeReference = `private-assets-${randomUUID()}`
  const { error: attachError } = await admin
    .from("orders")
    .update({ stripe_session_id: stripeReference })
    .eq("id", published.orderId)
  assert.ifError(attachError)
  const completion = await rpc("complete_order_payment", {
    p_order_id: published.orderId,
    p_method: "stripe",
    p_reference: stripeReference,
    p_draft_snapshot: null,
  })
  assert.equal(completion?.won, true)
  const afterPayment = await getCard(published.cardId)
  const publication = await rpc("publish_paid_draft", {
    p_card_id: published.cardId,
    p_owner: owner.id,
    p_acknowledgement: "I understand that this invitation will become public and read-only.",
    p_expected_draft_version: afterPayment.draft_version,
  })
  assert.equal(publication?.published, true)

  // Later publications may introduce a legacy covers/<user>/<file> reference
  // that is absent from the immutable first snapshot. Keep it in the current
  // publication membership only; owner/admin access must follow that exact
  // pointer without broadening same-owner cross-card reads.
  const laterLegacyCoverPath = `covers/${owner.id}/later-legacy-cover-${randomUUID()}.png`
  await uploadObject(laterLegacyCoverPath)
  const editWindow = await rpc("open_card_edit_window", {
    p_card_id: published.cardId,
    p_admin_id: administrator.id,
    p_reason: "Current legacy asset compatibility",
    p_request_id: randomUUID(),
  })
  assert.ok(editWindow?.windowId)
  const { data: publishedRevisionCard, error: revisionCardError } = await admin
    .from("cards")
    .select("revision_draft, draft_version")
    .eq("id", published.cardId)
    .single()
  assert.ifError(revisionCardError)
  const revisionDraft = structuredClone(publishedRevisionCard.revision_draft)
  const laterLegacyCoverUrl = `${supabaseUrl}/storage/v1/object/public/card-assets/${laterLegacyCoverPath}`
  const childInfo = revisionDraft.sections.find((section) => section.type === "child_info")
  if (childInfo) {
    childInfo.data.photoUrl = laterLegacyCoverUrl
  } else {
    revisionDraft.sections.push({
      type: "child_info",
      variant: "centered",
      enabled: true,
      order: revisionDraft.sections.length,
      data: { name: "Later legacy asset", dob: "", parents: "", photoUrl: laterLegacyCoverUrl },
    })
  }
  const revisionSave = await rpc("save_card_draft", {
    p_card_id: published.cardId,
    p_owner: owner.id,
    p_draft: revisionDraft,
    p_expected_draft_version: publishedRevisionCard.draft_version,
  })
  assert.equal(revisionSave?.mode, "revision")
  const laterPublication = await rpc("publish_card_revision", {
    p_card_id: published.cardId,
    p_owner: owner.id,
    p_edit_window_id: editWindow.windowId,
    p_acknowledgement: "I understand that this invitation will become public and read-only.",
    p_expected_draft_version: revisionSave.draftVersion,
  })
  assert.equal(laterPublication?.published, true)

  const draftCard = await makeDraft(owner.id)
  const ownerSession = await signIn(OWNER_EMAIL, OWNER_PASSWORD)
  const draftPath = `${draftCard.cardId}/landing/editor-${randomUUID()}.png`
  await uploadObject(draftPath, ownerSession.client)

  fixture.ownerId = owner.id
  fixture.adminId = administrator.id
  fixture.strangerId = stranger.user.id
  fixture.strangerEmail = strangerEmail
  fixture.publishedCardId = published.cardId
  fixture.publishedCardSlug = published.slug
  fixture.referencedStable = buildCardAssetReference(
    published.cardId,
    "gallery",
    stablePath.split("/").at(-1),
  )
  fixture.referencedHero = `/api/card-assets/${published.cardId}/landing/${legacyHeroPath.split("/").at(-1)}`
  fixture.referencedLegacy = `/api/card-assets/${published.cardId}/gallery/${legacyPath.split("/").at(-1)}`
  fixture.referencedLegacyCover = `/api/card-assets/${published.cardId}/${legacyCoverPath}`
  fixture.currentLegacyCover = `/api/card-assets/${published.cardId}/${laterLegacyCoverPath}`
  fixture.orphan = `/api/card-assets/${published.cardId}/gallery/${orphanPath.split("/").at(-1)}`
  fixture.legacyOrphan = `/api/card-assets/${published.cardId}/${legacyOrphanPath}`
  fixture.crossCardLegacyCover = `/api/card-assets/${draftCard.cardId}/${legacyCoverPath}`
  fixture.crossCardCurrentLegacyCover = `/api/card-assets/${draftCard.cardId}/${laterLegacyCoverPath}`
  fixture.draftCardId = draftCard.cardId
  fixture.draftAsset = `/api/card-assets/${draftCard.cardId}/landing/${draftPath.split("/").at(-1)}`
  fixture.ownerCookie = await cookieHeader(OWNER_EMAIL, OWNER_PASSWORD)
  fixture.adminCookie = await cookieHeader(ADMIN_EMAIL, ADMIN_PASSWORD)
  fixture.strangerCookie = await cookieHeader(strangerEmail, "stranger-password-123")
  fixture.publicUrl = `${supabaseUrl}/storage/v1/object/public/card-assets/${stablePath}`
  fixture.legacyPublicUrl = legacyCoverUrl
  fixture.currentLegacyPublicUrl = laterLegacyCoverUrl
  fixture.legacyHeroPublicUrl = legacyHeroUrl
  fixture.signedPath = stablePath
})

test("anonymous and authenticated strangers receive only frozen referenced images", async () => {
  for (const cookie of [undefined, fixture.strangerCookie]) {
    for (const reference of [
      fixture.referencedStable,
      fixture.referencedHero,
      fixture.referencedLegacy,
      fixture.currentLegacyCover,
    ]) {
      const response = await requestAsset(reference, cookie)
      assert.equal(response.status, 200, `${cookie ? "stranger" : "anonymous"} ${reference}`)
      assert.equal(response.headers.get("content-type"), "image/png")
      assert.match(response.headers.get("cache-control") ?? "", /no-store/)
      assert.equal(response.headers.get("x-content-type-options"), "nosniff")
      assert.equal((await response.arrayBuffer()).byteLength, PNG_BYTES.byteLength)
    }
    assert.equal(
      (await requestAsset(fixture.referencedLegacyCover, cookie)).status,
      404,
      "superseded first-publication legacy cover must not remain a guest asset",
    )
    assert.equal((await requestAsset(fixture.orphan, cookie)).status, 404)
    assert.equal((await requestAsset(fixture.legacyOrphan, cookie)).status, 404)
  }
})

test("owner and administrator retain authorized access to unpublished and orphan assets", async () => {
  for (const cookie of [fixture.ownerCookie, fixture.adminCookie]) {
    assert.equal((await requestAsset(fixture.orphan, cookie)).status, 200)
    assert.equal((await requestAsset(fixture.draftAsset, cookie)).status, 200)
    assert.equal((await requestAsset(fixture.referencedHero, cookie)).status, 200)
    assert.equal((await requestAsset(fixture.referencedLegacyCover, cookie)).status, 200)
    assert.equal((await requestAsset(fixture.currentLegacyCover, cookie)).status, 200)
    assert.equal((await requestAsset(fixture.legacyOrphan, cookie)).status, 404)
  }
  for (const cookie of [undefined, fixture.strangerCookie]) {
    assert.equal((await requestAsset(fixture.draftAsset, cookie)).status, 404)
  }
})

test("disable blocks subsequent guest reads and restore re-enables referenced reads", async () => {
  const disabled = await fetch(`${appUrl}/api/admin/cards/${fixture.publishedCardId}/publish`, {
    method: "POST",
    headers: { cookie: fixture.adminCookie, "content-type": "application/json" },
    body: JSON.stringify({ command: "disable", reason: "Private asset access test" }),
  })
  assert.equal(disabled.status, 200)
  for (const reference of [fixture.referencedStable, fixture.referencedHero, fixture.currentLegacyCover]) {
    assert.equal((await requestAsset(reference)).status, 404)
  }
  assert.equal((await requestAsset(fixture.referencedStable, fixture.ownerCookie)).status, 200)
  assert.equal((await requestAsset(fixture.referencedStable, fixture.adminCookie)).status, 200)
  assert.equal((await requestAsset(fixture.referencedHero, fixture.ownerCookie)).status, 200)
  assert.equal((await requestAsset(fixture.referencedHero, fixture.adminCookie)).status, 200)
  assert.equal((await requestAsset(fixture.referencedLegacyCover, fixture.ownerCookie)).status, 200)
  assert.equal((await requestAsset(fixture.referencedLegacyCover, fixture.adminCookie)).status, 200)
  assert.equal((await requestAsset(fixture.currentLegacyCover, fixture.ownerCookie)).status, 200)
  assert.equal((await requestAsset(fixture.currentLegacyCover, fixture.adminCookie)).status, 200)

  const restored = await fetch(`${appUrl}/api/admin/cards/${fixture.publishedCardId}/publish`, {
    method: "POST",
    headers: { cookie: fixture.adminCookie, "content-type": "application/json" },
    body: JSON.stringify({ command: "restore" }),
  })
  assert.equal(restored.status, 200)
  for (const reference of [fixture.referencedStable, fixture.referencedHero, fixture.currentLegacyCover]) {
    assert.equal((await requestAsset(reference)).status, 200)
  }
})

test("direct public storage and browser signed URLs do not bypass the app route", async () => {
  assertLocalSupabaseTarget()
  const publicResponse = await fetch(fixture.publicUrl, { redirect: "manual" })
  assert.notEqual(publicResponse.status, 200)
  const legacyPublicResponse = await fetch(fixture.legacyPublicUrl, { redirect: "manual" })
  assert.notEqual(legacyPublicResponse.status, 200)
  const legacyHeroPublicResponse = await fetch(fixture.legacyHeroPublicUrl, { redirect: "manual" })
  assert.notEqual(legacyHeroPublicResponse.status, 200)
  const currentLegacyPublicResponse = await fetch(fixture.currentLegacyPublicUrl, { redirect: "manual" })
  assert.notEqual(currentLegacyPublicResponse.status, 200)

  const buckets = await anon.storage.listBuckets()
  assert.ok(buckets.error || !(buckets.data ?? []).some((bucket) => bucket.name === "card-assets"))

  const ownerStorage = await signIn(OWNER_EMAIL, OWNER_PASSWORD)
  const signed = await ownerStorage.client.storage
    .from("card-assets")
    .createSignedUrl(fixture.signedPath, 60)
  assert.ok(signed.error)
  assert.equal(signed.data?.signedUrl ?? null, null)
})

test("browser uploads remain owner-scoped and path/type constrained", async () => {
  const ownerStorage = await signIn(OWNER_EMAIL, OWNER_PASSWORD)
  const strangerStorage = await signIn(fixture.strangerEmail, "stranger-password-123")
  assert.ok(ownerStorage.client)
  assert.ok(strangerStorage.client)

  const safeDraftPath = `${fixture.draftCardId}/gallery/direct-${randomUUID()}.png`
  await uploadObject(safeDraftPath, ownerStorage.client)
  const { error: ownerUpdateError } = await ownerStorage.client.storage
    .from("card-assets")
    .update(safeDraftPath, new Blob([PNG_BYTES], { type: "image/png" }), {
      contentType: "image/png",
      cacheControl: "no-store",
    })
  assert.ok(ownerUpdateError)
  const ownerDeleteTarget = `${fixture.draftCardId}/gallery/owner-delete-${randomUUID()}.png`
  await uploadObject(ownerDeleteTarget, ownerStorage.client)
  const { error: ownerDeleteError } = await ownerStorage.client.storage
    .from("card-assets")
    .remove([ownerDeleteTarget])
  assert.ifError(ownerDeleteError)

  const strangerMutationTarget = `${fixture.draftCardId}/gallery/stranger-mutation-${randomUUID()}.png`
  await uploadObject(strangerMutationTarget, ownerStorage.client)
  const { error: strangerUpdateError } = await strangerStorage.client.storage
    .from("card-assets")
    .update(strangerMutationTarget, new Blob([PNG_BYTES], { type: "image/png" }), {
      contentType: "image/png",
    })
  assert.ok(strangerUpdateError)
  const { error: strangerDeleteError } = await strangerStorage.client.storage
    .from("card-assets")
    .remove([strangerMutationTarget])
  assert.ifError(strangerDeleteError)
  assert.equal(
    (await requestAsset(`/api/card-assets/${fixture.draftCardId}/gallery/${strangerMutationTarget.split("/").at(-1)}`, fixture.ownerCookie)).status,
    200,
    "a stranger delete must not remove the owner's private object",
  )

  const { error: anonymousUploadError } = await anon.storage
    .from("card-assets")
    .upload(`${fixture.draftCardId}/gallery/anonymous-${randomUUID()}.png`, new Blob([PNG_BYTES], { type: "image/png" }), {
      upsert: false,
      contentType: "image/png",
    })
  assert.ok(anonymousUploadError)

  const { error: strangerUploadError } = await strangerStorage.client.storage
    .from("card-assets")
    .upload(`${fixture.draftCardId}/gallery/stranger-${randomUUID()}.png`, new Blob([PNG_BYTES], { type: "image/png" }), {
      upsert: false,
      contentType: "image/png",
    })
  assert.ok(strangerUploadError)

  const { error: unsafeExtensionError } = await ownerStorage.client.storage
    .from("card-assets")
    .upload(`${fixture.draftCardId}/gallery/unsafe-${randomUUID()}.svg`, new Blob([PNG_BYTES], { type: "image/svg+xml" }), {
      upsert: false,
      contentType: "image/svg+xml",
    })
  assert.ok(unsafeExtensionError)
})

test("malformed, cross-card, traversal and SSRF-shaped requests fail closed", async () => {
  assertLocalSupabaseTarget()
  const attempts = [
    `/api/card-assets/${fixture.publishedCardId}/../gallery/${fixture.orphan.split("/").at(-1)}`,
    `/api/card-assets/${fixture.publishedCardId}/gallery/%2e%2e.png`,
    `/api/card-assets/${fixture.publishedCardId}/gallery/%252e%252e.png`,
    `/api/card-assets/${fixture.publishedCardId}/../../etc/passwd`,
    `/api/card-assets/${fixture.publishedCardId}/covers/${fixture.strangerId}/cover.png`,
    fixture.crossCardLegacyCover,
    fixture.crossCardCurrentLegacyCover,
  ]
  for (const reference of attempts) {
    const response = await fetch(new URL(reference, appUrl), { redirect: "manual" })
    assert.notEqual(response.status, 200, reference)
    assert.notEqual(response.status, 302, reference)
  }

  // Legacy covers are keyed by user, not card. An authenticated owner or
  // administrator must not use another card's endpoint to probe that shared
  // historical namespace unless the target card explicitly references it.
  for (const cookie of [fixture.ownerCookie, fixture.adminCookie]) {
    assert.equal((await requestAsset(fixture.crossCardLegacyCover, cookie)).status, 404)
  }
})
