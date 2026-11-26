import assert from "node:assert/strict"
import test from "node:test"
import { randomUUID } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"
import { pathToFileURL } from "node:url"
import {
  inspectReceipt,
  MAX_RECEIPT_BYTES,
  readReceipt,
  uploadReceipt,
} from "./payment-receipts.ts"

const owner = randomUUID(),
  other = randomUUID(),
  order = randomUUID(),
  receipt = randomUUID()
const pdf = Buffer.from("%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n")
function fakeDb(rows = {}, options = {}) {
  const calls = []
  const db = {
    calls,
    from(table) {
      const query = {
        select() {
          return query
        },
        eq() {
          return query
        },
        order() {
          return query
        },
        limit() {
          return query
        },
        async maybeSingle() {
          calls.push(table)
          return { data: rows[table] ?? null, error: options.queryError?.[table] ?? null }
        },
      }
      return query
    },
    storage: {
      from() {
        return {
          async upload() {
            calls.push("upload")
            return { error: options.uploadError ?? null }
          },
          async download() {
            calls.push("download")
            return {
              data: options.download ?? new Blob([pdf]),
              error: options.downloadError ?? null,
            }
          },
        }
      },
    },
    async rpc() {
      calls.push("rpc")
      return { data: randomUUID(), error: options.rpcError ?? null }
    },
  }
  return db
}
function form(file = pdf) {
  const data = new FormData()
  data.set("receipt", new File([file], "untrusted.html", { type: "text/html" }))
  data.set("operationId", receipt)
  data.set("method", "duitnow")
  data.set("slotNumber", "1")
  return data
}

test("detects supported formats from bytes despite lying name/MIME; rejects unknown/truncated/empty/oversize files", () => {
  assert.equal(inspectReceipt(pdf).contentType, "application/pdf")
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  )
  assert.equal(inspectReceipt(png).contentType, "image/png")
  assert.equal(
    inspectReceipt(Buffer.from([255, 216, 255, 224, 0, 2, 255, 217])).contentType,
    "image/jpeg",
  )
  const webp = Buffer.alloc(24)
  webp.write("RIFF")
  webp.writeUInt32LE(16, 4)
  webp.write("WEBPVP8 ", 8)
  assert.equal(inspectReceipt(webp).contentType, "image/webp")
  for (const bytes of [
    Buffer.alloc(0),
    Buffer.from("<html>not a PDF</html>"),
    pdf.subarray(0, 10),
    png.subarray(0, 20),
    Buffer.alloc(MAX_RECEIPT_BYTES + 1),
  ])
    assert.throws(() => inspectReceipt(bytes))
  const max = Buffer.alloc(MAX_RECEIPT_BYTES, 32)
  pdf.copy(max)
  max.write("%%EOF", max.length - 5)
  assert.equal(inspectReceipt(max).sizeBytes, MAX_RECEIPT_BYTES)
})

test("missing proof and invalid optional references cannot submit", async () => {
  const db = fakeDb({ orders: { user_id: owner, status: "pending" } })
  await assert.rejects(uploadReceipt(db, owner, order, new FormData()), /resit/)
  const data = form()
  data.set("reference", "bad\nreference")
  await assert.rejects(uploadReceipt(db, owner, order, data), /Rujukan/)
  assert.deepEqual(db.calls, [])
})
test("ownership is checked before storing bytes", async () => {
  const db = fakeDb({ orders: { user_id: other, status: "pending" } })
  await assert.rejects(uploadReceipt(db, owner, order, form()), /tidak ditemui/)
  assert.deepEqual(db.calls, ["orders"])
})
test("valid owned upload permits empty reference and attaches only after storage succeeds", async () => {
  const db = fakeDb({ orders: { user_id: owner, status: "pending" } })
  const result = await uploadReceipt(db, owner, order, form())
  assert.equal(result.receiptId, receipt)
  assert.deepEqual(db.calls, ["orders", "payment_receipts", "upload", "rpc"])
})
test("storage failure never submits; ambiguous successful upload can be safely retried", async () => {
  const db = fakeDb(
    { orders: { user_id: owner, status: "pending" } },
    { uploadError: { message: "network" }, downloadError: { message: "missing" } },
  )
  await assert.rejects(uploadReceipt(db, owner, order, form()), /Muat naik gagal/)
  assert(!db.calls.includes("rpc"))
  const retry = fakeDb(
    { orders: { user_id: owner, status: "pending" } },
    { uploadError: { message: "exists" } },
  )
  await uploadReceipt(retry, owner, order, form())
  assert(retry.calls.includes("rpc"))
  const failure = fakeDb(
    { orders: { user_id: owner, status: "pending" } },
    { rpcError: { message: "conflict" } },
  )
  await assert.rejects(uploadReceipt(failure, owner, order, form()), /belum dihantar/)
})
test("replaying an attached/removed receipt never recreates its file", async () => {
  const sha = inspectReceipt(pdf).sha256
  const db = fakeDb({
    orders: { user_id: owner, status: "paid" },
    payment_receipts: {
      id: receipt,
      sha256: sha,
      object_path: `${order}/${receipt}/${sha}`,
      transfer_reference: "",
      attempt_id: randomUUID(),
      manual_payment_attempts: { method: "duitnow", slot_snapshot: { slotNumber: 1 } },
    },
  })
  await uploadReceipt(db, owner, order, form())
  assert(!db.calls.includes("upload"))
})
function readable(role = "customer", current = receipt, access = "available", latest = receipt) {
  return fakeDb({
    users: { role },
    payment_receipts: {
      id: receipt,
      content_type: "application/pdf",
      object_path: "private",
      manual_payment_attempts: { order_id: order, user_id: owner, current_receipt_id: current },
      payment_receipt_access: { state: access },
    },
    manual_payment_attempts: { current_receipt_id: latest },
  })
}
test("only owner current latest receipt or administrator can download; quarantine denies both", async () => {
  for (const [db, user, code] of [
    [readable(), owner, 200],
    [readable(), other, 404],
    [readable("customer", randomUUID()), owner, 404],
    [readable("customer", receipt, "available", randomUUID()), owner, 404],
    [readable("admin", randomUUID()), other, 200],
    [readable("admin", receipt, "quarantined"), other, 404],
    [readable("customer", receipt, "removed"), owner, 404],
  ]) {
    const response = await readReceipt(db, user, order, receipt)
    assert.equal(response.status, code)
    if (code === 200) {
      assert.equal(response.headers.get("cache-control"), "private, no-store")
      assert.match(response.headers.get("content-disposition"), /^attachment/)
    } else assert(!db.calls.includes("download"))
  }
})
test("download/query failure is explicit and does not grant access", async () => {
  const db = fakeDb({}, { queryError: { users: { message: "offline" } } })
  assert.equal((await readReceipt(db, owner, order, receipt)).status, 503)
  assert(!db.calls.includes("download"))
})

// Optional embedded PostgreSQL runner. The default suite above has no external
// dependencies; CI/local database verification sets PAYMENT_TEST_PGLITE.
test(
  "PostgreSQL migration, ACLs, review editing, mandatory evidence, immutable replacement, partial totals and tombstones",
  { skip: !process.env.PAYMENT_TEST_PGLITE },
  async () => {
    const { PGlite } = await import(pathToFileURL(process.env.PAYMENT_TEST_PGLITE).href)
    const db = new PGlite()
    try {
      await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select current_user::text$$;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb); alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 create function storage.extension(text) returns text language sql as $$select split_part($1,'.',-1)$$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 grant all on all tables in schema storage to anon,authenticated,service_role;
 alter default privileges in schema public grant all on tables to service_role;
 `)
      for (const file of readdirSync(new URL("../supabase/migrations/", import.meta.url))
        .filter((f) => f.endsWith(".sql"))
        .sort())
        await db.exec(
          readFileSync(new URL("../supabase/migrations/" + file, import.meta.url), "utf8").replace(
            'create extension if not exists "pgcrypto";',
            "",
          ),
        )
      const admin = randomUUID(),
        customer = randomUUID(),
        stranger = randomUUID(),
        oid = randomUUID(),
        cid = randomUUID()
      for (const id of [admin, customer, stranger])
        await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{}')", [
          id,
          id + "@test.invalid",
        ])
      await db.query("update public.users set role='admin' where id=$1", [admin])
      await db.query(
        "insert into public.orders(id,user_id,price_myr,status) values($1,$2,4900,'pending')",
        [oid, customer],
      )
      await db.query(
        "insert into public.cards(id,order_id,user_id,slug,custom_data_draft) values($1,$2,$3,$4,$5)",
        [cid, oid, customer, cid, JSON.stringify({ sections: [], theme: {} })],
      )
      await db.query(
        "select public.configure_tng($1,true,'Payee','https://example.test/qr.png','Transfer')",
        [admin],
      )
      const sha = "a".repeat(64)
      async function upload(
        id = randomUUID(),
        attempt = null,
        expected = null,
        who = customer,
        method = "tng",
        stored = true,
      ) {
        const path = `${oid}/${id}/${sha}`
        if (stored)
          await db.query(
            "insert into storage.objects(bucket_id,name) values('payment-receipts',$1)",
            [path],
          )
        return (
          await db.query(
            "select public.submit_manual_receipt($1,$2,$3,$4,$5,$6,1,'',$7,'application/pdf',50,$8) as id",
            [who, oid, id, attempt, expected, method, path, sha],
          )
        ).rows[0].id
      }
      await assert.rejects(upload(randomUUID(), null, null, stranger), /ORDER_NOT_FOUND/)
      await assert.rejects(
        upload(randomUUID(), null, null, customer, "tng", false),
        /RECEIPT_REQUIRED/,
      )
      const r1 = randomUUID(),
        aid = await upload(r1)
      assert.equal(await upload(r1), aid)
      await assert.rejects(
        db.query("select public.reserve_checkout($1,$2)", [oid, customer]),
        /MANUAL_PAYMENT_ACTIVE/,
      )
      await assert.rejects(
        db.query("select public.attach_checkout_session($1,$2,$3,'cs_test',now())", [
          oid,
          customer,
          randomUUID(),
        ]),
        /MANUAL_PAYMENT_ACTIVE/,
      )
      const r2 = randomUUID()
      assert.equal(await upload(r2, aid, r1), aid)
      await assert.rejects(upload(randomUUID(), aid, r1), /RECEIPT_CHANGED/)
      await assert.rejects(
        db.query("select public.review_manual_receipt($1,$2,'confirmed',1000,'')", [admin, r1]),
        /RECEIPT_CHANGED/,
      )
      await assert.rejects(
        db.query("select public.review_manual_receipt($1,$2,'rejected',0,'')", [admin, r2]),
      )
      await assert.rejects(
        db.query("select public.review_manual_receipt($1,$2,'rejected',0,'Wrong file')", [
          stranger,
          r2,
        ]),
        /FORBIDDEN/,
      )
      await db.query("select public.review_manual_receipt($1,$2,'rejected',0,'Wrong file')", [
        admin,
        r2,
      ])
      await db.query("select public.review_manual_receipt($1,$2,'rejected',0,'Wrong file')", [
        admin,
        r2,
      ])
      await db.exec("begin")
      await db.query("select public.reserve_checkout($1,$2)", [oid, customer]) // rejection with no confirmed amount permits Stripe
      await db.exec("rollback")
      const r3 = randomUUID()
      await upload(r3, aid, r2)
      const partial = (
        await db.query("select public.review_manual_receipt($1,$2,'confirmed',2000,'') as result", [
          admin,
          r3,
        ])
      ).rows[0].result
      assert.equal(partial.remainingSen, 2900)
      assert(!partial.won)
      const draftEditDuringPartialReview = (
        await db.query(
          "select public.update_card_draft_if_editing($1,'{\"sections\":[],\"regressionProbe\":true}'::jsonb) as result",
          [cid],
        )
      ).rows[0].result
      assert.equal(draftEditDuringPartialReview, true)
      assert.deepEqual(
        (
          await db.query("select custom_data_draft from public.cards where id=$1", [cid])
        ).rows[0].custom_data_draft,
        { sections: [], regressionProbe: true },
      )
      await assert.rejects(upload(randomUUID(), aid, r3), /RECEIPT_CHANGED/)
      await assert.rejects(
        upload(randomUUID(), null, null, customer, "duitnow"),
        /MANUAL_METHOD_LOCKED/,
      )
      await assert.rejects(
        db.query("select public.reserve_checkout($1,$2)", [oid, customer]),
        /MANUAL_PAYMENT_ACTIVE/,
      )
      const r4 = randomUUID()
      await upload(r4)
      const paid = (
        await db.query("select public.review_manual_receipt($1,$2,'confirmed',3000,'') as result", [
          admin,
          r4,
        ])
      ).rows[0].result
      assert.equal(paid.won, true)
      assert.equal(paid.excessSen, 100)
      const replay = (
        await db.query("select public.review_manual_receipt($1,$2,'confirmed',3000,'') as result", [
          admin,
          r4,
        ])
      ).rows[0].result
      assert.equal(replay.won, false)
      const state = (await db.query("select public.manual_payment_state($1) as value", [oid]))
        .rows[0].value
      assert.equal(state.receipt.id, r4)
      assert.equal(state.receivedSen, 5000)
      assert.equal(
        (await db.query("select status,payment_method from public.orders where id=$1", [oid]))
          .rows[0].payment_method,
        "tng",
      )
      assert.equal(
        (await db.query("select count(*)::int as n from public.cards where order_id=$1", [oid]))
          .rows[0].n,
        1,
      )
      assert.deepEqual(
        (
          await db.query(
            "select status,manual_paid_draft,is_published,custom_data_draft is not null as has_draft from public.orders o join public.cards c on c.order_id=o.id where o.id=$1",
            [oid],
          )
        ).rows[0],
        { status: "paid", manual_paid_draft: true, is_published: false, has_draft: true },
      )
      assert.equal(state.reviewer, undefined)
      assert.equal(state.review?.evidence_object_path, undefined)

      // A later upload on the same paid manual order is a duplicate. Correcting
      // it appends exactly one row, and repeating that correction is idempotent
      // even though the correction is now the latest review.
      const r5 = randomUUID()
      await upload(r5)
      const duplicate = (
        await db.query(
          "select public.admin_review_manual_payment($1,(select attempt_id from public.payment_receipts where id=$2),'confirmed',300,null,'Later duplicate',null,null) as result",
          [admin, r5],
        )
      ).rows[0].result
      assert.equal(duplicate.duplicate, true)
      const duplicateReview = (
        await db.query(
          "select id from public.manual_payment_reviews where receipt_id=$1 and outcome='duplicate'",
          [r5],
        )
      ).rows[0].id
      const correctionSql =
        "select public.admin_review_manual_payment($1,(select attempt_id from public.payment_receipts where id=$2),'rejected',0,null,'Duplicate corrected',null,$3) as result"
      const correction = (await db.query(correctionSql, [admin, r5, duplicateReview])).rows[0].result
      assert.equal(correction.replayed, false)
      const correctionRetry = (await db.query(correctionSql, [admin, r5, duplicateReview])).rows[0]
        .result
      assert.equal(correctionRetry.replayed, true)
      assert.equal(
        (
          await db.query(
            "select count(*)::int as n from public.manual_payment_reviews where receipt_id=$1",
            [r5],
          )
        ).rows[0].n,
        2,
      )
      assert.equal(
        (
          await db.query("select is_published from public.cards where id=$1", [cid])
        ).rows[0].is_published,
        false,
      )
      for (const target of [r1, r3, r4]) {
        for (const action of [
          "quarantined",
          "quarantined",
          "removing",
          "removing",
          "removed",
          "removed",
        ])
          await db.query(
            "select public.manage_payment_receipt($1,$2,$3,'operational','Retention exception')",
            [admin, target, action],
          )
        assert.equal(
          (
            await db.query(
              "select count(*)::int as n from public.payment_receipt_events where receipt_id=$1",
              [target],
            )
          ).rows[0].n,
          3,
        )
      }
      await assert.rejects(
        db.query("delete from public.payment_receipts where id=$1", [r1]),
        /IMMUTABLE/,
      )
      await assert.rejects(db.query("delete from public.orders where id=$1", [oid]))
      await assert.rejects(db.query("delete from public.cards where id=$1", [cid]))
      // Bank DuitNow follows the same proof boundary and frozen-slot path.
      const bankOrder = randomUUID(),
        bankCard = randomUUID(),
        bankReceipt = randomUUID()
      await db.query(
        "select public.admin_update_duitnow_slot($1,1,true,'Bank','Payee','Maybank','https://example.test/qr.png','Transfer')",
        [admin],
      )
      await db.query(
        "insert into public.orders(id,user_id,price_myr,status) values($1,$2,4900,'pending')",
        [bankOrder, customer],
      )
      await db.query(
        "insert into public.cards(id,order_id,user_id,slug,custom_data_draft) values($1,$2,$3,$4,'{\"sections\":[]}')",
        [bankCard, bankOrder, customer, bankCard],
      )
      const bankPath = `${bankOrder}/${bankReceipt}/${sha}`
      await db.query("insert into storage.objects(bucket_id,name) values('payment-receipts',$1)", [
        bankPath,
      ])
      await db.query(
        "select public.submit_manual_receipt($1,$2,$3,null,null,'duitnow',1,'',$4,'application/pdf',50,$5)",
        [customer, bankOrder, bankReceipt, bankPath, sha],
      )
      const bankState = (
        await db.query("select public.manual_payment_state($1) as value", [bankOrder])
      ).rows[0].value
      assert.equal(bankState.attempt.method, "duitnow")
      assert.equal(bankState.attempt.slot_snapshot.payeeName, "Payee")
      await assert.rejects(
        db.query("update public.manual_payment_attempts set current_receipt_id=$1 where id=$2", [
          r4,
          bankState.attempt.id,
        ]),
        /foreign key/,
      )
      await assert.rejects(
        db.query("update public.manual_payment_reviews set reason='changed' where receipt_id=$1", [
          r2,
        ]),
        /IMMUTABLE/,
      )
      // Browser ACL + restrictive storage policy remains closed even if another
      // feature introduces a broad permissive storage policy.
      await db.exec(
        "create policy broad_test on storage.objects for all to authenticated using(true) with check(true); set role authenticated;",
      )
      assert.equal(
        (
          await db.query(
            "select count(*)::int as n from storage.objects where bucket_id='payment-receipts'",
          )
        ).rows[0].n,
        0,
      )
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values('payment-receipts','guessed')",
        ),
        /row-level security/,
      )
      await assert.rejects(db.query("select * from public.payment_receipts"), /permission denied/)
      await assert.rejects(
        db.query("select public.submit_duitnow_transfer($1,1,'ABC')", [oid]),
        /permission denied/,
      )
      await db.exec("reset role; set role anon;")
      assert.equal(
        (
          await db.query(
            "select count(*)::int as n from storage.objects where bucket_id='payment-receipts'",
          )
        ).rows[0].n,
        0,
      )
      await db.exec("reset role;")
      const qrUrl = '/api/payment-qr/' + 'a'.repeat(64) + '.png'
      await db.query("select public.configure_tng($1,true,'Test payee',$2,'Scan QR')", [admin, qrUrl])
      const countHistory = async () => (await db.query("select count(*)::int as n from public.tng_config_history")).rows[0].n
      const historyBefore = await countHistory()
      await db.query("select public.configure_tng($1,true,'Test payee',$2,'Scan QR')", [admin, qrUrl])
      assert.equal(await countHistory(), historyBefore)
      await assert.rejects(db.query("update public.tng_config_history set config='{}'"), /IMMUTABLE_HISTORY/)
      await assert.rejects(db.query("select public.configure_tng($1,true,'Test payee',$2,'Scan QR')", [customer, qrUrl]), /FORBIDDEN/)
      await db.exec("set role authenticated;")
      await assert.rejects(db.query("select * from public.tng_config_history"), /permission denied/)
      await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('payment-qr','guessed.png')"), /row-level security/)
      await db.exec("reset role;")
    } finally {
      await db.close()
    }
  },
)
