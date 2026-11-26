import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test, { after, before } from "node:test"
import { createClient } from "@supabase/supabase-js"
import { assertLocalSupabaseTarget, readAuthorizedLocalEnv, runAuthorizedSql } from "./local-supabase-target.mjs"
const PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
)

const localEnv = readAuthorizedLocalEnv()

const admin = createClient(
  localEnv.NEXT_PUBLIC_SUPABASE_URL,
  localEnv.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
const anon = createClient(
  localEnv.NEXT_PUBLIC_SUPABASE_URL,
  localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const probeBucket = `shared-policy-probe-${randomUUID().slice(0, 8)}`
const probeObject = "shared.png"
const protectedObject = `policy-probe-${randomUUID()}.png`
let probeCreated = false
let probeUploaded = false
let protectedUploaded = false

before(async () => {
  assertLocalSupabaseTarget()

  runAuthorizedSql(`
    insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
    values ('${probeBucket}', '${probeBucket}', false, 1048576, array['image/png']);
    create policy "${probeBucket} bucket select"
      on storage.buckets for select to anon, authenticated
      using (id = '${probeBucket}');
    create policy "${probeBucket} object select"
      on storage.objects for select to anon, authenticated
      using (bucket_id = '${probeBucket}');
    `)
  probeCreated = true
  const { error } = await admin.storage.from(probeBucket).upload(
    probeObject,
    new Blob([PNG_BYTES], { type: "image/png" }),
    { upsert: false, contentType: "image/png" },
  )
  assert.ifError(error)
  probeUploaded = true
  const protectedUpload = await admin.storage.from("card-assets").upload(
    protectedObject,
    new Blob([PNG_BYTES], { type: "image/png" }),
    { upsert: false, contentType: "image/png" },
  )
  assert.ifError(protectedUpload.error)
  protectedUploaded = true
})

after(async () => {
  assertLocalSupabaseTarget()
  if (protectedUploaded) {
    const removed = await admin.storage.from("card-assets").remove([protectedObject])
    assert.ifError(removed.error)
  }
  if (probeUploaded) {
    const { error } = await admin.storage.from(probeBucket).remove([probeObject])
    assert.ifError(error)
  }
  if (!probeCreated) return
  const deleted = await admin.storage.deleteBucket(probeBucket)
  assert.ifError(deleted.error)
  runAuthorizedSql(`
    drop policy if exists "${probeBucket} object select" on storage.objects;
    drop policy if exists "${probeBucket} bucket select" on storage.buckets;
  `)
})

test("scoped card-assets isolation preserves an unrelated bucket list/download policy", async () => {
  assertLocalSupabaseTarget()
  const listed = await anon.storage.from(probeBucket).list("", { limit: 10 })
  assert.ifError(listed.error)
  assert.ok((listed.data ?? []).some((entry) => entry.name === probeObject))

  const downloaded = await anon.storage.from(probeBucket).download(probeObject)
  assert.ifError(downloaded.error)
  assert.equal((await downloaded.data.arrayBuffer()).byteLength, PNG_BYTES.byteLength)

  const protectedDownload = await anon.storage.from("card-assets").download(protectedObject)
  assert.ok(protectedDownload.error, "card-assets browser download must remain denied")

  const cardAssetList = await anon.storage.from("card-assets").list("", { limit: 10 })
  assert.ifError(cardAssetList.error)
  assert.equal(cardAssetList.data?.length ?? 0, 0, "card-assets rows must remain hidden")

  for (const bucket of ["payment-qr", "payment-receipts", "payment-review-evidence"]) {
    const result = await anon.storage.from(bucket).list("", { limit: 1 })
    assert.equal(result.data?.length ?? 0, 0, `${bucket} browser list must remain empty`)
    const download = await anon.storage.from(bucket).download("policy-probe.png")
    assert.ok(download.error, `${bucket} browser download must remain denied`)
  }
})
