import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import {
  PAYMENT_SUPPORT_FALLBACK_MESSAGE,
  buildPaymentSupportMessage,
  validateSupportEmail,
  validateSupportWhatsApp,
} from "./payment-support.ts"
import { manualPaymentMessage } from "./manual-payment-message.ts"

test("normalizes one support email and rejects unsafe or multi-address input", () => {
  assert.deepEqual(validateSupportEmail("  Help+event@Example.COM  "), {
    ok: true,
    value: "help+event@example.com",
  })
  assert.equal(validateSupportEmail("help\tdesk@example.com").ok, false)
  assert.equal(validateSupportEmail("help\ndesk@example.com").ok, false)
  assert.equal(validateSupportEmail("help@example.com\n").ok, false)
  assert.equal(validateSupportEmail("help@example.com, other@example.com").ok, false)
  assert.equal(validateSupportEmail(`${"a".repeat(65)}@example.com`).ok, false)
  assert.deepEqual(validateSupportEmail("   "), { ok: true, value: null })
})

test("normalizes Malaysian +60 WhatsApp formatting and enforces structural length", () => {
  assert.deepEqual(validateSupportWhatsApp(" +60 (12) 345-6789 "), {
    ok: true,
    value: "+60123456789",
  })
  assert.deepEqual(validateSupportWhatsApp("(+60) 12-345 6789"), {
    ok: true,
    value: "+60123456789",
  })
  assert.deepEqual(validateSupportWhatsApp("+60 3-1234 5678"), {
    ok: true,
    value: "+60312345678",
  })
  assert.equal(validateSupportWhatsApp("+601234567").ok, false)
  assert.equal(validateSupportWhatsApp("+60012345678").ok, false)
  assert.equal(validateSupportWhatsApp("60123456789").ok, false)
  assert.equal(validateSupportWhatsApp("+60\t12 3456789").ok, false)
  assert.deepEqual(validateSupportWhatsApp(""), { ok: true, value: null })
})

test("builds each approved customer support message without broken links", () => {
  const both = buildPaymentSupportMessage({
    email: "help?desk@example.com",
    whatsapp: "+60 (12) 345-6789",
  })
  assert.equal(
    both.text,
    "Ada masalah dengan bayaran ini. Sila hubungi help?desk@example.com atau WhatsApp +60123456789.",
  )
  assert.equal(both.email?.href, "mailto:help%3Fdesk%40example.com")
  assert.equal(both.whatsapp?.href, "https://wa.me/60123456789")
  assert.equal(buildPaymentSupportMessage({ email: "a@example.com", whatsapp: null }).text,
    "Ada masalah dengan bayaran ini. Sila hubungi a@example.com.")
  assert.equal(buildPaymentSupportMessage({ email: null, whatsapp: "+60123456789" }).text,
    "Ada masalah dengan bayaran ini. Sila WhatsApp +60123456789.")
  const empty = buildPaymentSupportMessage({ email: null, whatsapp: null })
  assert.equal(empty.text, PAYMENT_SUPPORT_FALLBACK_MESSAGE)
  assert.equal(empty.fallback, true)
  assert.equal(empty.email, null)
  assert.equal(empty.whatsapp, null)
})

test("manual payment copy only calls an invitation editable when its lifecycle allows it", () => {
  const base = {
    method: "duitnow",
    reason: "",
    receivedSen: 4000,
    creditedSen: 4000,
    remainingSen: 1000,
    excessSen: 0,
  }

  assert.match(
    manualPaymentMessage({ ...base, outcome: "duplicate" }, true),
    /masih boleh disunting/,
  )
  assert.doesNotMatch(
    manualPaymentMessage({ ...base, outcome: "duplicate" }, false),
    /masih boleh disunting/,
  )
  assert.match(
    manualPaymentMessage({ ...base, outcome: "confirmed" }, true),
    /sedia untuk disunting/,
  )
  assert.doesNotMatch(
    manualPaymentMessage({ ...base, outcome: "confirmed" }, false),
    /disunting/,
  )
})

test(
  "guards support configuration writes and preserves immutable audit history",
  { skip: !process.env.PAYMENT_TEST_PGLITE },
  async () => {
    const { PGlite } = await import(pathToFileURL(process.env.PAYMENT_TEST_PGLITE).href)
    const db = new PGlite()
    const migration = readFileSync(
      new URL("../supabase/migrations/032_payment_support_contacts.sql", import.meta.url),
      "utf8",
    )
    const admin = "00000000-0000-0000-0000-000000000001"
    const customer = "00000000-0000-0000-0000-000000000002"
    const update = (
      actor,
      version,
      email,
      whatsapp,
      reason = "Review verification",
      operation = "change",
    ) =>
      db.query(
        "select public.update_payment_support_config($1,$2,$3,$4,$5,$6) as result",
        [actor, version, email, whatsapp, reason, operation],
      )

    try {
      await db.exec(
        "create role anon; create role authenticated; create role service_role bypassrls; create table public.users(id uuid primary key, role text); grant usage on schema public to anon, authenticated, service_role;",
      )
      await db.exec(migration)
      await db.query("insert into public.users values ($1,$2),($3,$4)", [
        admin,
        "admin",
        customer,
        "customer",
      ])

      await db.exec("set role authenticated")
      await assert.rejects(
        db.query("select * from payment_support_contact_history"),
        /permission denied/,
      )
      await assert.rejects(
        update(admin, 1, "help@example.com", null),
        /permission denied/,
      )

      await db.exec("reset role; set role service_role")
      await assert.rejects(
        update(customer, 1, "help@example.com", null),
        /FORBIDDEN/,
      )
      await assert.rejects(
        db.query("update payment_support_config set email='bypass@example.com'"),
        /permission denied/,
      )

      await update(admin, 1, "help+event@example.com", "+60123456789")
      const first = (
        await db.query("select * from payment_support_contact_history")
      ).rows[0]
      assert.equal(first.changed_by, admin)
      assert.equal(first.previous_email, null)
      assert.equal(first.new_email, "help+event@example.com")
      assert.equal(first.reason, "Review verification")
      await assert.rejects(
        update(admin, 1, "stale@example.com", null),
        /STALE/,
      )
      await assert.rejects(
        update(admin, 2, "help@example.com", "+65012345678"),
        /WHATSAPP/,
      )
      await assert.rejects(update(admin, 2, ".bad@example.com", null))
      await assert.rejects(update(admin, 2, "help..desk@example.com", null))
      await assert.rejects(update(admin, 2, "help@example.com", null, ""), /REASON/)

      const noOp = await update(
        admin,
        2,
        "help+event@example.com",
        "+60123456789",
        "No-op check",
      )
      assert.equal(noOp.rows[0].result.changed, false)
      await update(admin, 2, null, null, "Clear both")
      await update(
        admin,
        3,
        first.new_email,
        first.new_whatsapp,
        "Restore prior details",
        "restore",
      )
      assert.equal(
        (await db.query("select * from payment_support_contact_history")).rows.length,
        3,
      )
      await assert.rejects(
        db.query("delete from payment_support_contact_history"),
        /permission denied/,
      )
      await db.exec("reset role")
      await assert.rejects(
        db.query("update payment_support_contact_history set reason='rewritten'"),
        /IMMUTABLE_HISTORY/,
      )
    } finally {
      await db.close()
    }
  },
)
