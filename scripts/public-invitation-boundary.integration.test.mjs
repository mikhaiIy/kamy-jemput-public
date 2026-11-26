import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test, { before } from "node:test"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { selectGuestInvitation } from "../lib/public-invitation-decision.ts"

import {
  assertLocalSupabaseTarget,
  requireLoopbackAppUrl,
  readAuthorizedLocalEnv,
} from "./local-supabase-target.mjs"

const localEnv = readAuthorizedLocalEnv()
const appUrl = requireLoopbackAppUrl("PUBLIC_BOUNDARY_TEST_APP_URL")
const OWNER_EMAIL = "kamy@gmail.com"
const OWNER_PASSWORD = "123"
const ADMIN_EMAIL = "kamy.admin@gmail.com"
const ADMIN_PASSWORD = "123"
const ACK = "I understand that this invitation will become public and read-only."

const admin = createClient(localEnv.NEXT_PUBLIC_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const fixture = {}

async function signIn(email, password) {
  assertLocalSupabaseTarget()
  const client = createClient(localEnv.NEXT_PUBLIC_SUPABASE_URL, localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  assert.ifError(error)
  assert.ok(data.session)
  return { client, session: data.session }
}

async function cookieHeader(email, password) {
  const { session } = await signIn(email, password)
  const values = new Map()
  const serverClient = createServerClient(
    localEnv.NEXT_PUBLIC_SUPABASE_URL,
    localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [...values].map(([name, value]) => ({ name, value })),
        setAll: (cookies) => {
          for (const cookie of cookies) values.set(cookie.name, cookie.value)
        },
      },
    },
  )
  const { error } = await serverClient.auth.setSession(session)
  assert.ifError(error)
  return [...values].map(([name, value]) => `${name}=${value}`).join("; ")
}

async function rpc(name, params) {
  assertLocalSupabaseTarget()
  const { data, error } = await admin.rpc(name, params)
  assert.ifError(error)
  return data
}

async function fetchPage(path, init = {}) {
  return fetch(new URL(path, appUrl), {
    ...init,
    headers: { ...(init.headers ?? {}), "Cache-Control": "no-cache" },
    redirect: "manual",
  })
}

async function loadServerVisibilityDecision(slug) {
  // Exercise the same runtime-neutral data decision used by the server
  // loader. This avoids treating compressed OG bytes as a plaintext oracle.
  assertLocalSupabaseTarget()
  const { data: row, error: rowError } = await admin
    .from("cards")
    .select(
      "id, user_id, slug, is_published, published_at, current_publication_id, active_edit_window_id, orders!inner(status)",
    )
    .eq("slug", slug)
    .eq("orders.status", "paid")
    .maybeSingle()
  assert.ifError(rowError)
  if (!row) return null

  const { data: availability, error: availabilityError } = await admin
    .from("card_availability_actions")
    .select("action")
    .eq("card_id", row.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle()
  assert.ifError(availabilityError)

  const orders = Array.isArray(row.orders) ? row.orders : [row.orders]
  const isPaid = orders.some((order) => order?.status === "paid")
  let publication = null
  let editWindow = null
  let profileName = null

  if (row.current_publication_id) {
    const { data, error } = await admin
      .from("card_publications")
      .select("id, snapshot")
      .eq("id", row.current_publication_id)
      .eq("card_id", row.id)
      .maybeSingle()
    assert.ifError(error)
    publication = data
  }
  if (row.active_edit_window_id) {
    const { data, error } = await admin
      .from("card_edit_windows")
      .select("expires_at")
      .eq("id", row.active_edit_window_id)
      .eq("card_id", row.id)
      .maybeSingle()
    assert.ifError(error)
    editWindow = data
    const { data: profile, error: profileError } = await admin
      .from("users")
      .select("name")
      .eq("id", row.user_id)
      .maybeSingle()
    assert.ifError(profileError)
    profileName = profile?.name ?? null
  }

  return selectGuestInvitation({
    row,
    isPaid,
    availabilityAction: availability?.action ?? null,
    publication,
    editWindow,
    profileName,
  })
}

before(async () => {
  assertLocalSupabaseTarget()
  const [{ data: owner }, { data: administrator }] = await Promise.all([
    admin.from("users").select("id, name").eq("email", OWNER_EMAIL).single(),
    admin.from("users").select("id").eq("email", ADMIN_EMAIL).single(),
  ])
  assert.ok(owner?.id)
  assert.ok(administrator?.id)

  const created = await rpc("create_draft_order_and_card", {
    p_template_id: "malay-wedding-v2",
    p_owner: owner.id,
    p_slug: `issue74-http-${randomUUID()}`,
  })
  assert.ok(created?.cardId && created?.orderId && created?.slug)

  assertLocalSupabaseTarget()
  const { data: card, error: cardError } = await admin
    .from("cards")
    .select("custom_data_draft, draft_version")
    .eq("id", created.cardId)
    .single()
  assert.ifError(cardError)
  const draft = structuredClone(card.custom_data_draft)
  const marker = `Issue 74 boundary ${randomUUID()}`
  const eventInfo = draft.sections.find((section) => section.type === "event_info")
  assert.ok(eventInfo)
  eventInfo.data.eventName = marker
  await rpc("save_card_draft", {
    p_card_id: created.cardId,
    p_owner: owner.id,
    p_draft: draft,
    p_expected_draft_version: card.draft_version,
  })

  const stripeReference = `issue74-http-session-${randomUUID()}`
  assertLocalSupabaseTarget()
  const { error: orderError } = await admin
    .from("orders")
    .update({ stripe_session_id: stripeReference })
    .eq("id", created.orderId)
  assert.ifError(orderError)
  const completion = await rpc("complete_order_payment", {
    p_order_id: created.orderId,
    p_method: "stripe",
    p_reference: stripeReference,
    p_draft_snapshot: null,
  })
  assert.equal(completion?.won, true)

  assertLocalSupabaseTarget()
  const { data: paidCard, error: paidCardError } = await admin
    .from("cards")
    .select("draft_version")
    .eq("id", created.cardId)
    .single()
  assert.ifError(paidCardError)
  const ownerCookie = await cookieHeader(OWNER_EMAIL, OWNER_PASSWORD)
  const firstPublish = await fetchPage(`/api/cards/${created.cardId}/publish`, {
    method: "POST",
    headers: { cookie: ownerCookie, "content-type": "application/json" },
    body: JSON.stringify({
      acknowledged: true,
      acknowledgement: ACK,
      expectedDraftVersion: paidCard.draft_version,
    }),
  })
  assert.equal(firstPublish.status, 200)
  const firstPublishBody = await firstPublish.json()
  assert.equal(firstPublishBody.published, true)
  assert.equal(firstPublishBody.replayed, false)

  assertLocalSupabaseTarget()
  const { data: firstState, error: firstStateError } = await admin
    .from("cards")
    .select("current_publication_id, published_at, is_published")
    .eq("id", created.cardId)
    .single()
  assert.ifError(firstStateError)
  assert.equal(firstState.is_published, true)
  assert.ok(firstState.current_publication_id)

  const replayPublish = await fetchPage(`/api/cards/${created.cardId}/publish`, {
    method: "POST",
    headers: { cookie: ownerCookie, "content-type": "application/json" },
    body: JSON.stringify({
      acknowledged: true,
      acknowledgement: ACK,
      expectedDraftVersion: paidCard.draft_version,
    }),
  })
  assert.equal(replayPublish.status, 200)
  const replayPublishBody = await replayPublish.json()
  assert.equal(replayPublishBody.published, true)
  assert.equal(replayPublishBody.replayed, true)

  assertLocalSupabaseTarget()
  const { data: replayState, error: replayStateError } = await admin
    .from("cards")
    .select("current_publication_id, published_at, is_published")
    .eq("id", created.cardId)
    .single()
  assert.ifError(replayStateError)
  assert.deepEqual(replayState, firstState)

  fixture.cardId = created.cardId
  fixture.orderId = created.orderId
  fixture.slug = created.slug
  fixture.marker = marker
  fixture.ownerId = owner.id
  fixture.ownerName = owner.name || "The host"
  fixture.firstDraftVersion = paidCard.draft_version
  fixture.firstPublicationId = firstState.current_publication_id
  fixture.firstPublishedAt = firstState.published_at
  fixture.ownerCookie = ownerCookie
  fixture.adminCookie = await cookieHeader(ADMIN_EMAIL, ADMIN_PASSWORD)
})

test("published guest boundary serves the current publication", async () => {
  const response = await fetchPage(`/i/${fixture.slug}`)
  const body = await response.text()
  assert.equal(response.status, 200)
  assert.match(body, new RegExp(fixture.marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.doesNotMatch(body, /is making edits\. Please wait\./)

  const decision = await loadServerVisibilityDecision(fixture.slug)
  assert.equal(decision?.state, "published")
  assert.match(JSON.stringify(decision?.data), new RegExp(fixture.marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
})

test("admin grant hides prior HTML, metadata, OG and RSVP while keeping the slug", async () => {
  const grant = await fetchPage(`/api/admin/cards/${fixture.cardId}/edit-window`, {
    method: "POST",
    headers: { cookie: fixture.adminCookie, "content-type": "application/json" },
    body: JSON.stringify({ reason: "HTTP boundary correction", requestId: randomUUID() }),
  })
  assert.equal(grant.status, 200)
  const grantBody = await grant.json()
  assert.ok(grantBody.windowId)
  assert.ok(grantBody.expiresAt)

  const staleFirstPublish = await fetchPage(`/api/cards/${fixture.cardId}/publish`, {
    method: "POST",
    headers: { cookie: fixture.ownerCookie, "content-type": "application/json" },
    body: JSON.stringify({
      acknowledged: true,
      acknowledgement: ACK,
      expectedDraftVersion: fixture.firstDraftVersion,
    }),
  })
  assert.equal(staleFirstPublish.status, 409)
  assert.match(await staleFirstPublish.text(), /tidak boleh diterbitkan|keadaan semasa/i)

  assertLocalSupabaseTarget()
  const { data: staleState, error: staleStateError } = await admin
    .from("cards")
    .select("current_publication_id, published_at, is_published, active_edit_window_id")
    .eq("id", fixture.cardId)
    .single()
  assert.ifError(staleStateError)
  assert.equal(staleState.is_published, false)
  assert.equal(staleState.active_edit_window_id, grantBody.windowId)
  assert.equal(staleState.current_publication_id, fixture.firstPublicationId)
  assert.equal(staleState.published_at, fixture.firstPublishedAt)

  const decision = await loadServerVisibilityDecision(fixture.slug)
  assert.equal(decision?.state, "editing")
  assert.equal("data" in (decision ?? {}), false)

  const page = await fetchPage(`/i/${fixture.slug}`)
  const pageBody = await page.text()
  assert.equal(page.status, 200)
  assert.match(pageBody, /is making edits\. Please wait\./)
  assert.doesNotMatch(pageBody, new RegExp(fixture.marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  assert.doesNotMatch(pageBody, /event_info|rsvp|guestbook/i)

  const metadata = await fetchPage(`/i/${fixture.slug}`)
  const metadataBody = await metadata.text()
  assert.doesNotMatch(metadataBody, new RegExp(fixture.marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))

  // Next's file-based metadata route uses a build-time content hash in the
  // image path. Follow the URL emitted in the page metadata instead of
  // inventing a non-existent unhashed route.
  const ogUrlMatch = metadataBody.match(/property="og:image" content="([^"]+)"/)
  assert.ok(ogUrlMatch?.[1], "editing metadata must expose the generated OG image URL")
  const ogUrl = new URL(ogUrlMatch[1])
  const og = await fetchPage(`${ogUrl.pathname}${ogUrl.search}`)
  assert.equal(og.status, 200)
  assert.match(og.headers.get("content-type") ?? "", /image\/png/)
  assert.match(og.headers.get("cache-control") ?? "", /no-store/)
  // The binary response is not a reliable text-exposure oracle: PNG text is
  // rasterized and compressed. The shared selector assertion above proves the
  // OG input decision is editing-without-data; this response check only proves
  // the rendered surface is a no-store image boundary.
  const ogBytes = Buffer.from(await og.arrayBuffer())
  assert.ok(ogBytes.length > 100)

  const rsvp = await fetchPage(`/api/rsvp/${fixture.cardId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ guestName: "Boundary Guest", attending: true, message: "must be rejected" }),
  })
  assert.equal(rsvp.status, 404)

  const devPreview = await fetchPage("/api/dev/preview-variant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cardId: fixture.cardId, variant: "unsafe" }),
  })
  const expectedDevPreviewStatus = process.env.PUBLIC_BOUNDARY_TEST_PRODUCTION === "1" ? 404 : 410
  assert.equal(devPreview.status, expectedDevPreviewStatus)

  assertLocalSupabaseTarget()
  const { data: rsvps, error } = await admin
    .from("rsvp_responses")
    .select("id")
    .eq("card_id", fixture.cardId)
  assert.ifError(error)
  assert.equal(rsvps.length, 0)
})
