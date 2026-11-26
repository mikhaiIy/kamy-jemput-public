import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test, { before } from "node:test"
import { createClient } from "@supabase/supabase-js"

import {
  assertLocalSupabaseTarget,
  readAuthorizedLocalEnv,
  runAuthorizedSql,
} from "./local-supabase-target.mjs"

const PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
)
const OWNER_EMAIL = "kamy@gmail.com"
const ADMIN_EMAIL = "kamy.admin@gmail.com"

const localEnv = readAuthorizedLocalEnv()
const admin = createClient(
  localEnv.NEXT_PUBLIC_SUPABASE_URL,
  localEnv.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
const anonKey = localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
const ownerStorage = createClient(
  localEnv.NEXT_PUBLIC_SUPABASE_URL,
  anonKey,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const fixture = {}

async function rpc(name, params) {
  assertLocalSupabaseTarget()
  const { data, error } = await admin.rpc(name, params)
  assert.ifError(error)
  return data
}

async function signInOwner() {
  const { error } = await ownerStorage.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: "123",
  })
  assert.ifError(error)
}

async function upload(path, client = ownerStorage, contentType = "image/png") {
  const { error } = await client.storage.from("card-assets").upload(
    path,
    new Blob([PNG_BYTES], { type: contentType }),
    { upsert: false, contentType, cacheControl: "no-store" },
  )
  return error
}

async function makePublishedCard(ownerId) {
  const result = await rpc("create_draft_order_and_card", {
    p_template_id: "malay-wedding-v2",
    p_owner: ownerId,
    p_slug: `controlled-storage-${randomUUID()}`,
  })
  assert.ok(result?.cardId && result?.orderId)
  const { data: initial, error: initialError } = await admin
    .from("cards")
    .select("id, custom_data_draft, draft_version")
    .eq("id", result.cardId)
    .single()
  assert.ifError(initialError)
  const filename = `source-${randomUUID()}.png`
  const sourcePath = `${result.cardId}/landing/${filename}`
  const draft = structuredClone(initial.custom_data_draft)
  const landing = draft.sections.find((section) => section.type === "landing")
  assert.ok(landing)
  landing.data.coverPhotoUrl = `/api/card-assets/${result.cardId}/landing/${filename}`
  const saved = await rpc("save_card_draft", {
    p_card_id: result.cardId,
    p_owner: ownerId,
    p_draft: draft,
    p_expected_draft_version: initial.draft_version,
  })
  assert.ok(saved?.draftVersion)
  assert.equal(await upload(sourcePath), null)
  const paymentReference = `controlled-storage-${randomUUID()}`
  const { error: orderError } = await admin
    .from("orders")
    .update({ stripe_session_id: paymentReference })
    .eq("id", result.orderId)
  assert.ifError(orderError)
  const completion = await rpc("complete_order_payment", {
    p_order_id: result.orderId,
    p_method: "stripe",
    p_reference: paymentReference,
    p_draft_snapshot: null,
  })
  assert.equal(completion?.won, true)
  const { data: payable, error: payableError } = await admin
    .from("cards")
    .select("draft_version")
    .eq("id", result.cardId)
    .single()
  assert.ifError(payableError)
  const publication = await rpc("publish_paid_draft", {
    p_card_id: result.cardId,
    p_owner: ownerId,
    p_acknowledgement: "I understand that this invitation will become public and read-only.",
    p_expected_draft_version: payable.draft_version,
  })
  assert.equal(publication?.published, true)
  const { data: published, error: publishedError } = await admin
    .from("cards")
    .select("id, order_id, current_publication_id, custom_data, draft_version")
    .eq("id", result.cardId)
    .single()
  assert.ifError(publishedError)
  assert.equal(published.current_publication_id, publication.publicationId)
  fixture.paths.push(sourcePath)
  return published
}

async function deny(label, operation) {
  const error = await operation()
  assert.ok(error, `${label} must be denied`)
}

async function assertAppendOnlyDenied(label, path, operation) {
  await operation()
  const { data, error } = await admin.storage.from("card-assets").download(path)
  assert.ifError(error)
  assert.deepEqual(
    new Uint8Array(await data.arrayBuffer()),
    PNG_BYTES,
    `${label} must leave the historical object unchanged`,
  )
}

before(async () => {
  assertLocalSupabaseTarget()
  const [{ data: owner, error: ownerError }, { data: administrator, error: adminError }] = await Promise.all([
    admin.from("users").select("id").eq("email", OWNER_EMAIL).single(),
    admin.from("users").select("id").eq("email", ADMIN_EMAIL).single(),
  ])
  assert.ifError(ownerError)
  assert.ifError(adminError)
  assert.ok(owner?.id && administrator?.id)
  await signInOwner()
  fixture.ownerId = owner.id
  fixture.adminId = administrator.id
  fixture.paths = []

  fixture.active = await makePublishedCard(owner.id)
  const activeWindow = await rpc("open_card_edit_window", {
    p_card_id: fixture.active.id,
    p_admin_id: administrator.id,
    p_reason: "Storage append-only active-window regression",
    p_request_id: randomUUID(),
  })
  assert.ok(activeWindow?.windowId)

  fixture.expired = await makePublishedCard(owner.id)
  const expiredWindowId = randomUUID()
  runAuthorizedSql(`
    begin;
    insert into public.card_edit_windows(
      id, card_id, owner_id, admin_id, request_id, reason, granted_at, expires_at
    ) values (
      '${expiredWindowId}', '${fixture.expired.id}', '${owner.id}', '${administrator.id}',
      '${randomUUID()}', 'Storage append-only expired-window regression',
      current_timestamp - interval '8 days', current_timestamp - interval '1 day'
    );
    select public.authorize_card_mutation('${fixture.expired.id}', 'open_edit_window');
    update public.cards
    set active_edit_window_id = '${expiredWindowId}', is_published = false
    where id = '${fixture.expired.id}';
    commit;
  `)

  fixture.disabled = await makePublishedCard(owner.id)
  const disabled = await rpc("set_card_availability", {
    p_card_id: fixture.disabled.id,
    p_admin_id: administrator.id,
    p_action: "disabled",
    p_reason: "Storage append-only disabled-window regression",
  })
  assert.equal(disabled?.is_published, false)

  fixture.replacementSource = await makePublishedCard(owner.id)
  const { data: sourcePublication, error: sourcePublicationError } = await admin
    .from("card_publications")
    .select("id, snapshot")
    .eq("id", fixture.replacementSource.current_publication_id)
    .single()
  assert.ifError(sourcePublicationError)
  fixture.targetCardId = randomUUID()
  fixture.targetOrderId = randomUUID()
  const target = await rpc("create_card_replacement_grant", {
    p_predecessor_card_id: fixture.replacementSource.id,
    p_admin_id: administrator.id,
    p_reason: "Storage append-only pending target regression",
    p_request_id: randomUUID(),
    p_replacement_order_id: fixture.targetOrderId,
    p_replacement_card_id: fixture.targetCardId,
    p_slug: `controlled-storage-target-${randomUUID()}`,
    p_replacement_draft: sourcePublication.snapshot,
    p_expected_source_publication_id: sourcePublication.id,
  })
  assert.ok(target?.grantId)
  fixture.grantId = target.grantId
})

test("published active, expired and disabled windows cannot update/delete historical assets", async () => {
  for (const [label, card] of [
    ["active", fixture.active],
    ["expired", fixture.expired],
    ["disabled", fixture.disabled],
  ]) {
    const path = fixture.paths.find((item) => item.startsWith(`${card.id}/landing/source-`))
    assert.ok(path, `${label} source object is present`)
    await assertAppendOnlyDenied(`${label} update`, path, () => ownerStorage.storage.from("card-assets").update(
      path,
      new Blob([Uint8Array.from([1, 2, 3, 4])], { type: "image/png" }),
      { contentType: "image/png" },
    ))
    await assertAppendOnlyDenied(`${label} delete`, path, () => ownerStorage.storage.from("card-assets").remove([path]))
  }
})

test("only a valid active window accepts a new UUID upload, with MIME and state guards", async () => {
  const activeInsert = `${fixture.active.id}/landing/append-${randomUUID()}.png`
  assert.equal(await upload(activeInsert), null)
  fixture.paths.push(activeInsert)

  await deny("active invalid MIME", () => upload(
    `${fixture.active.id}/landing/invalid-${randomUUID()}.png`,
    ownerStorage,
    "text/plain",
  ))
  for (const [label, card] of [["expired", fixture.expired], ["disabled", fixture.disabled]]) {
    await deny(`${label} insert`, () => upload(`${card.id}/landing/append-${randomUUID()}.png`))
  }
})

test("pending replacement target remains owner-uploadable before preparation", async () => {
  const disabled = await rpc("set_card_availability", {
    p_card_id: fixture.replacementSource.id,
    p_admin_id: fixture.adminId,
    p_action: "disabled",
    p_reason: "Pending replacement moderation regression",
  })
  assert.equal(disabled?.is_published, false, "pending predecessor remains disable-able")
  const targetPath = `${fixture.targetCardId}/landing/owner-${randomUUID()}.png`
  assert.equal(await upload(targetPath), null)
  fixture.paths.push(targetPath)
})

test("grant creation rejects a stale reviewed source publication", async () => {
  const { data: snapshotRow, error: snapshotError } = await admin
    .from("card_publications")
    .select("snapshot")
    .eq("id", fixture.replacementSource.current_publication_id)
    .single()
  assert.ifError(snapshotError)
  const { error } = await admin.rpc("create_card_replacement_grant", {
    p_predecessor_card_id: fixture.replacementSource.id,
    p_admin_id: fixture.adminId,
    p_reason: "Stale source publication regression",
    p_request_id: randomUUID(),
    p_replacement_order_id: randomUUID(),
    p_replacement_card_id: randomUUID(),
    p_slug: `controlled-storage-stale-${randomUUID()}`,
    p_replacement_draft: snapshotRow.snapshot,
    p_expected_source_publication_id: randomUUID(),
  })
  assert.ok(error)
  assert.match(error.message, /PREDECESSOR_PUBLICATION_CHANGED/)
})
