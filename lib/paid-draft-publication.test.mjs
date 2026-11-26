import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { pathToFileURL } from "node:url"
import { test } from "node:test"

// This suite is intentionally opt-in because PGlite is a test-only dependency
// and is not part of the application install. CI/local DB verification sets
// PAID_DRAFT_TEST_PGLITE to its package entry point; a skipped run is not
// lifecycle coverage.
test(
  "paid-draft lifecycle: review editing, immutable payment snapshots, publication, privacy, asset policy, and availability",
  { skip: !process.env.PAID_DRAFT_TEST_PGLITE },
  async () => {
    const { PGlite } = await import(pathToFileURL(process.env.PAID_DRAFT_TEST_PGLITE).href)
    const db = new PGlite()
    try {
      await db.exec(`
        create role anon;
        create role authenticated;
        create role service_role bypassrls;
        create schema auth;
        create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
        create function auth.uid() returns uuid language sql stable as $$
          select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
        $$;
        create function auth.role() returns text language sql stable as $$
          select current_user::text
        $$;
        create schema storage;
        create table storage.buckets(
          id text primary key,name text,public boolean,file_size_limit bigint,
          allowed_mime_types text[]
        );
        create table storage.objects(
          id uuid default gen_random_uuid(),bucket_id text,name text,
          owner uuid,metadata jsonb default '{"mimetype":"image/png"}'::jsonb
        );
        alter table storage.objects enable row level security;
        create function storage.foldername(text) returns text[] language sql as $$
          select string_to_array(regexp_replace($1, '/[^/]*$', ''), '/')
        $$;
        create function storage.extension(text) returns text language sql as $$
          select split_part($1,'.',-1)
        $$;
        grant usage on schema public,auth,storage to anon,authenticated,service_role;
        grant all on all tables in schema storage to anon,authenticated,service_role;
        alter default privileges in schema public grant all on tables to service_role;
      `)

      for (const file of readdirSync(new URL("../supabase/migrations/", import.meta.url))
        .filter((name) => name.endsWith(".sql"))
        .sort()) {
        await db.exec(
          readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8").replace(
            'create extension if not exists "pgcrypto";',
            "",
          ),
        )
      }
      // The public-card policy checks the related paid order. Granting the
      // role a read path here lets the test distinguish "no private row" from
      // a role-level permission error; orders RLS still returns no owner rows.
      await db.exec("grant select on public.orders to anon")

      const owner = randomUUID()
      const stranger = randomUUID()
      const admin = randomUUID()
      const stripeOrder = randomUUID()
      const stripeCard = randomUUID()
      const manualOrder = randomUUID()
      const manualCard = randomUUID()
      const legacyOrder = randomUUID()
      const legacyCard = randomUUID()
      const unpaidDeleteOrder = randomUUID()
      const unpaidDeleteCard = randomUUID()
      const template = (
        await db.query("select id from public.templates order by id limit 1")
      ).rows[0].id
      const initial = { templateId: template, schemaVersion: 2, sections: [] }
      const latest = {
        templateId: template,
        schemaVersion: 2,
        sections: [{ type: "landing", data: { headline: "Latest saved copy" } }],
      }

      await db.query(
        "insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)",
        [
          owner,
          "paid-draft-owner@example.test",
          stranger,
          "paid-draft-stranger@example.test",
          admin,
          "paid-draft-admin@example.test",
        ],
      )
      await db.query("update public.users set role='admin' where id=$1", [admin])

      await db.query(
        `insert into public.orders(
           id,user_id,template_id,status,stripe_session_id,price_myr,custom_data
         ) values($1,$2,$3,'pending',$4,4900,$5)`,
        [stripeOrder, owner, template, "cs_paid_draft_test", JSON.stringify(initial)],
      )
      await db.query(
        `insert into public.cards(
           id,order_id,user_id,template_id,slug,custom_data,custom_data_draft
         ) values($1,$2,$3,$4,$5,$6,$6)`,
        [
          stripeCard,
          stripeOrder,
          owner,
          template,
          `paid-draft-${stripeCard}`,
          JSON.stringify(initial),
        ],
      )

      const payment = (
        await db.query(
          "select public.complete_order_payment($1,'stripe',$2,$3) as result",
          [stripeOrder, "cs_paid_draft_test", JSON.stringify({ stale: true })],
        )
      ).rows[0].result
      assert.equal(payment.won, true)
      assert.equal(payment.paidDraft, true)
      assert.equal(payment.published, false)
      const paymentRetry = (
        await db.query(
          "select public.complete_order_payment($1,'stripe',$2,$3) as result",
          [stripeOrder, "cs_paid_draft_test", JSON.stringify({ overwritten: true })],
        )
      ).rows[0].result
      assert.equal(paymentRetry.won, false)
      assert.equal(paymentRetry.reason, "ALREADY_COMPLETED")

      // The browser Storage policy admits every paid-draft owner upload, while
      // a different authenticated user cannot write into the card's folder.
      // This protects the upload path without reopening
      // published cards. The PGlite RLS runner cannot model Storage UPDATE /
      // DELETE without a browser SELECT policy, so those mutations are covered
      // by the real local Storage integration suite.
      const paidDraftAsset = `${stripeCard}/landing/paid-draft.png`
      const paidDraftProtectedAsset = paidDraftAsset
      await db.exec("set role authenticated")
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
      await db.query(
        "insert into storage.objects(bucket_id,name) values('card-assets',$1)",
        [paidDraftAsset],
      )
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [stranger])
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values('card-assets',$1)",
          [`${stripeCard}/landing/stranger.png`],
        ),
        /row-level security|policy/,
      )
      await db.exec("reset role")
      await db.query("select set_config('request.jwt.claim.sub','',false)")
      assert.deepEqual(
        (
          await db.query(
            "select name from storage.objects where bucket_id='card-assets' and name=$1",
            [paidDraftAsset],
          )
        ).rows.map((row) => row.name),
        [paidDraftAsset],
      )

      assert.deepEqual(
        (
          await db.query(
            `select o.status,o.manual_paid_draft,c.is_published,
                    c.custom_data_draft,c.custom_data,c.published_at,
                    c.draft_version,c.last_activity_at
               from public.orders o join public.cards c on c.order_id=o.id
              where o.id=$1`,
            [stripeOrder],
          )
        ).rows[0],
        {
          status: "paid",
          manual_paid_draft: true,
          is_published: false,
          custom_data_draft: initial,
          custom_data: initial,
          published_at: null,
          draft_version: 1,
          last_activity_at: null,
        },
      )
      assert.equal(
        (
          await db.query(
            "select count(*)::int as count from public.card_publication_actions where card_id=$1",
            [stripeCard],
          )
        ).rows[0].count,
        0,
      )

      await assert.rejects(
        db.query("select public.save_card_draft($1,$2,$3,1)", [stripeCard, stranger, JSON.stringify(latest)]),
        /FORBIDDEN/,
      )
      const save = (
        await db.query("select public.save_card_draft($1,$2,$3,1) as result", [
          stripeCard,
          owner,
          JSON.stringify(latest),
        ])
      ).rows[0].result
      assert.equal(save.saved, true)
      assert.equal(save.draftVersion, 2)
      const activity = (
        await db.query("select last_activity_at from public.cards where id=$1", [stripeCard])
      ).rows[0].last_activity_at
      assert.ok(activity)

      await assert.rejects(
        db.query("select public.save_card_draft($1,$2,$3,1)", [
          stripeCard,
          owner,
          JSON.stringify(initial),
        ]),
        /DRAFT_VERSION_CONFLICT/,
      )
      await assert.rejects(
        db.query("select public.publish_paid_draft($1,$2,$3,2)", [
          stripeCard,
          stranger,
          "I understand that this invitation will become public and read-only.",
        ]),
        /FORBIDDEN/,
      )
      await assert.rejects(
        db.query("select public.publish_paid_draft($1,$2,$3,2)", [
          stripeCard,
          owner,
          "I understand that this invitation will become public.",
        ]),
        /ACKNOWLEDGEMENT_REQUIRED/,
      )
      await assert.rejects(
        db.query("select public.publish_paid_draft($1,$2,$3,1)", [
          stripeCard,
          owner,
          "I understand that this invitation will become public and read-only.",
        ]),
        /DRAFT_VERSION_CONFLICT/,
      )

      const published = (
        await db.query("select public.publish_paid_draft($1,$2,$3,2) as result", [
          stripeCard,
          owner,
          "I understand that this invitation will become public and read-only.",
        ])
      ).rows[0].result
      assert.equal(published.published, true)
      assert.equal(published.replayed, false)
      const publishedRow = (
        await db.query(
          "select custom_data,custom_data_draft,is_published,published_at,draft_version,last_activity_at from public.cards where id=$1",
          [stripeCard],
        )
      ).rows[0]
      assert.deepEqual(
        {
          custom_data: publishedRow.custom_data,
          custom_data_draft: publishedRow.custom_data_draft,
          is_published: publishedRow.is_published,
          draft_version: publishedRow.draft_version,
          last_activity_at: publishedRow.last_activity_at,
        },
        {
          custom_data: latest,
          custom_data_draft: null,
          is_published: true,
          draft_version: 2,
          last_activity_at: activity,
        },
      )
      assert.equal(
        new Date(publishedRow.published_at).toISOString(),
        new Date(published.publishedAt).toISOString(),
      )
      const publishedAt = published.publishedAt
      const replay = (
        await db.query("select public.publish_paid_draft($1,$2,$3,2) as result", [
          stripeCard,
          owner,
          "I understand that this invitation will become public and read-only.",
        ])
      ).rows[0].result
      assert.equal(replay.replayed, true)
      assert.equal(
        new Date(
          (
            await db.query("select published_at from public.cards where id=$1", [stripeCard])
          ).rows[0].published_at,
        ).toISOString(),
        new Date(publishedAt).toISOString(),
      )
      assert.equal(
        (
          await db.query(
            "select count(*)::int as count from public.card_publication_actions where card_id=$1",
            [stripeCard],
          )
        ).rows[0].count,
        1,
      )
      await assert.rejects(
        db.query("select public.save_card_draft($1,$2,$3,2)", [
          stripeCard,
          owner,
          JSON.stringify({ stale: true }),
        ]),
        /CARD_NOT_EDITABLE/,
      )

      async function assertPublishedAssetWritesDenied(label) {
        await db.exec("set role authenticated")
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
        const update = await db.query(
          "update storage.objects set name=$1 where bucket_id='card-assets' and name=$2",
          [`${stripeCard}/landing/${label}-update.png`, paidDraftProtectedAsset],
        )
        assert.equal(update.affectedRows, 0, `${label}: update must be denied`)
        const remove = await db.query(
          "delete from storage.objects where bucket_id='card-assets' and name=$1",
          [paidDraftProtectedAsset],
        )
        assert.equal(remove.affectedRows, 0, `${label}: delete must be denied`)
        await assert.rejects(
          db.query(
            "insert into storage.objects(bucket_id,name) values('card-assets',$1)",
            [`${stripeCard}/landing/${label}-insert.png`],
          ),
          /row-level security|policy/,
        )
        await db.exec("reset role")
        await db.query("select set_config('request.jwt.claim.sub','',false)")
        assert.deepEqual(
          (
            await db.query(
              "select name from storage.objects where bucket_id='card-assets' and name=$1",
              [paidDraftProtectedAsset],
            )
          ).rows.map((row) => row.name),
          [paidDraftProtectedAsset],
          `${label}: existing asset must remain unchanged`,
        )
      }

      await assertPublishedAssetWritesDenied("after-publication")
      await assert.rejects(
        db.query("update public.cards set custom_data=$1 where id=$2", [
          JSON.stringify({ overwritten: true }),
          stripeCard,
        ]),
        /PUBLISHED_SNAPSHOT_IMMUTABLE/,
      )

      // An administrative disable remains a separate, reasoned lifecycle and
      // cannot be undone by customer publication/recovery retries.
      await db.query("select public.set_card_availability($1,$2,'disabled','test reason')", [
        stripeCard,
        admin,
      ])
      const unavailable = (
        await db.query("select public.publish_paid_draft($1,$2,$3,2) as result", [
          stripeCard,
          owner,
          "I understand that this invitation will become public and read-only.",
        ])
      ).rows[0].result
      assert.equal(unavailable.state, "unavailable")
      assert.equal(
        (
          await db.query("select public.finalize_paid_order($1) as result", [stripeOrder])
        ).rows[0].result.state,
        "unavailable",
      )
      assert.equal(
        (
          await db.query("select is_published from public.cards where id=$1", [stripeCard])
        ).rows[0].is_published,
        false,
      )
      await assertPublishedAssetWritesDenied("after-disable")
      const disabledSnapshot = (
        await db.query(
          `select o.manual_paid_draft,c.custom_data,c.custom_data_draft,
                  c.is_published,c.published_at
             from public.orders o join public.cards c on c.order_id=o.id
            where c.id=$1`,
          [stripeCard],
        )
      ).rows[0]
      assert.deepEqual(
        {
          manual_paid_draft: disabledSnapshot.manual_paid_draft,
          custom_data: disabledSnapshot.custom_data,
          custom_data_draft: disabledSnapshot.custom_data_draft,
          is_published: disabledSnapshot.is_published,
        },
        {
          manual_paid_draft: true,
          custom_data: latest,
          custom_data_draft: null,
          is_published: false,
        },
      )
      assert.equal(
        new Date(disabledSnapshot.published_at).toISOString(),
        new Date(publishedAt).toISOString(),
      )

      await db.query("select public.set_card_availability($1,$2,'restored','restore test')", [
        stripeCard,
        admin,
      ])
      await assertPublishedAssetWritesDenied("after-restore")
      const restoredSnapshot = (
        await db.query(
          `select o.manual_paid_draft,c.custom_data,c.custom_data_draft,
                  c.is_published,c.published_at
             from public.orders o join public.cards c on c.order_id=o.id
            where c.id=$1`,
          [stripeCard],
        )
      ).rows[0]
      assert.deepEqual(
        {
          manual_paid_draft: restoredSnapshot.manual_paid_draft,
          custom_data: restoredSnapshot.custom_data,
          custom_data_draft: restoredSnapshot.custom_data_draft,
          is_published: restoredSnapshot.is_published,
        },
        {
          manual_paid_draft: true,
          custom_data: latest,
          custom_data_draft: null,
          is_published: true,
        },
      )
      assert.equal(
        new Date(restoredSnapshot.published_at).toISOString(),
        new Date(publishedAt).toISOString(),
      )

      // Manual confirmation uses the same private paid-draft entitlement and
      // keeps the immutable receipt snapshot separate from later edits.
      await db.query("select public.configure_tng($1,true,'Payee','https://example.test/qr.png','Transfer')", [admin])
      await db.query(
        "insert into public.orders(id,user_id,template_id,status,price_myr,custom_data) values($1,$2,$3,'pending',4900,$4)",
        [manualOrder, owner, template, JSON.stringify(initial)],
      )
      await db.query(
        "insert into public.cards(id,order_id,user_id,template_id,slug,custom_data,custom_data_draft) values($1,$2,$3,$4,$5,$6,$6)",
        [manualCard, manualOrder, owner, template, `manual-paid-draft-${manualCard}`, JSON.stringify(initial)],
      )
      const unpaidAsset = `${manualCard}/landing/unpaid.png`
      await db.exec("set role authenticated")
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
      await db.query(
        "insert into storage.objects(bucket_id,name) values('card-assets',$1)",
        [unpaidAsset],
      )
      await db.exec("reset role")
      await db.query("select set_config('request.jwt.claim.sub','',false)")
      assert.deepEqual(
        (await db.query("select name from storage.objects where bucket_id='card-assets' and name=$1", [unpaidAsset])).rows.map((row) => row.name),
        [unpaidAsset],
      )

      async function assertReviewAssetWrites(label) {
        const ownerAsset = `${manualCard}/landing/${label}-owner.png`
        await db.exec("set role authenticated")
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner])
        await db.query(
          "insert into storage.objects(bucket_id,name) values('card-assets',$1)",
          [ownerAsset],
        )
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [stranger])
        await assert.rejects(
          db.query(
            "insert into storage.objects(bucket_id,name) values('card-assets',$1)",
            [`${manualCard}/landing/${label}-stranger-insert.png`],
          ),
          /row-level security|policy/,
        )
        await db.exec("reset role")
        await db.query("select set_config('request.jwt.claim.sub','',false)")
        assert.deepEqual(
          (
            await db.query(
              "select name from storage.objects where bucket_id='card-assets' and name=$1",
              [ownerAsset],
            )
          ).rows.map((row) => row.name),
          [ownerAsset],
          `${label}: owner asset must remain unchanged`,
        )
      }

      const receipt = randomUUID()
      const sha = "b".repeat(64)
      const receiptPath = `${manualOrder}/${receipt}/${sha}`
      await db.query("insert into storage.objects(bucket_id,name) values('payment-receipts',$1)", [receiptPath])
      await db.query(
        `select public.submit_manual_receipt(
           $1,$2,$3,null,null,'tng',1,'',$4,'application/pdf',50,$5
        )`,
        [owner, manualOrder, receipt, receiptPath, sha],
      )
      const submittedAttempt = (
        await db.query(
          "select id,current_receipt_id,state,draft_snapshot from public.manual_payment_attempts where order_id=$1",
          [manualOrder],
        )
      ).rows[0]
      assert.equal(submittedAttempt.state, "submitted")
      assert.deepEqual(submittedAttempt.draft_snapshot, initial)
      const submittedReceiptAudit = (
        await db.query(
          `select r.id,r.attempt_id,r.version,r.object_path,r.content_type,
                  r.size_bytes,r.sha256,r.transfer_reference
             from public.payment_receipts r where r.id=$1`,
          [receipt],
        )
      ).rows[0]
      const submittedDraft = {
        templateId: template,
        schemaVersion: 2,
        sections: [{ type: "landing", data: { headline: "Edited during review" } }],
      }
      const submittedSave = (
        await db.query("select public.save_card_draft($1,$2,$3,1) as result", [
          manualCard,
          owner,
          JSON.stringify(submittedDraft),
        ])
      ).rows[0].result
      assert.equal(submittedSave.saved, true)
      assert.equal(submittedSave.draftVersion, 2)
      await assertReviewAssetWrites("submitted")
      await assert.rejects(
        db.query("select public.publish_paid_draft($1,$2,$3,2)", [
          manualCard,
          owner,
          "I understand that this invitation will become public and read-only.",
        ]),
        /ORDER_NOT_PAID/,
      )

      const insufficientEvidence = `review-evidence/${manualOrder}/insufficient-proof.png`
      const evidenceSha = "c".repeat(64)
      await db.query(
        "insert into storage.objects(bucket_id,name,metadata) values('payment-review-evidence',$1,$2::jsonb)",
        [
          insufficientEvidence,
          JSON.stringify({ mimetype: "image/png", size: "12", sha256: evidenceSha }),
        ],
      )
      const insufficientReview = (
        await db.query(
          `select public.admin_review_manual_payment(
             $1,$2,'insufficient',2000,2900,'Partial payment',$3,null
           ) as result`,
          [admin, submittedAttempt.id, insufficientEvidence],
        )
      ).rows[0].result
      assert.equal(insufficientReview.outcome, "insufficient")
      assert.equal(insufficientReview.won, false)
      const insufficientReviewAudit = (
        await db.query(
          `select id,receipt_id,outcome,received_amount_sen,credited_amount_sen,
                  remaining_amount_sen,excess_amount_sen,reason,evidence_object_path,
                  evidence_content_type,evidence_size_bytes,evidence_sha256
             from public.manual_payment_reviews where receipt_id=$1`,
          [receipt],
        )
      ).rows[0]
      const insufficientDraft = {
        templateId: template,
        schemaVersion: 2,
        sections: [{ type: "landing", data: { headline: "Edited after partial review" } }],
      }
      const insufficientSave = (
        await db.query("select public.save_card_draft($1,$2,$3,2) as result", [
          manualCard,
          owner,
          JSON.stringify(insufficientDraft),
        ])
      ).rows[0].result
      assert.equal(insufficientSave.saved, true)
      assert.equal(insufficientSave.draftVersion, 3)
      await assertReviewAssetWrites("insufficient")
      await assert.rejects(
        db.query("select public.publish_paid_draft($1,$2,$3,3)", [
          manualCard,
          owner,
          "I understand that this invitation will become public and read-only.",
        ]),
        /ORDER_NOT_PAID/,
      )

      const topUpReceipt = randomUUID()
      const topUpSha = "d".repeat(64)
      const topUpPath = `${manualOrder}/${topUpReceipt}/${topUpSha}`
      await db.query(
        "insert into storage.objects(bucket_id,name) values('payment-receipts',$1)",
        [topUpPath],
      )
      await db.query(
        `select public.submit_manual_receipt(
           $1,$2,$3,null,null,'tng',1,'top-up',$4,'application/pdf',50,$5
         )`,
        [owner, manualOrder, topUpReceipt, topUpPath, topUpSha],
      )
      const topUpAttempt = (
        await db.query(
          "select id,current_receipt_id,state,prior_attempt_id,draft_snapshot from public.manual_payment_attempts where current_receipt_id=$1",
          [topUpReceipt],
        )
      ).rows[0]
      assert.equal(topUpAttempt.state, "submitted")
      assert.equal(topUpAttempt.prior_attempt_id, submittedAttempt.id)
      assert.deepEqual(topUpAttempt.draft_snapshot, insufficientDraft)
      const topUpDraft = {
        templateId: template,
        schemaVersion: 2,
        sections: [{ type: "landing", data: { headline: "Edited during top-up review" } }],
      }
      const topUpSave = (
        await db.query("select public.save_card_draft($1,$2,$3,3) as result", [
          manualCard,
          owner,
          JSON.stringify(topUpDraft),
        ])
      ).rows[0].result
      assert.equal(topUpSave.saved, true)
      assert.equal(topUpSave.draftVersion, 4)
      await assertReviewAssetWrites("top-up")
      const topUpReceiptAudit = (
        await db.query(
          `select r.id,r.attempt_id,r.version,r.object_path,r.content_type,
                  r.size_bytes,r.sha256,r.transfer_reference
             from public.payment_receipts r where r.id=$1`,
          [topUpReceipt],
        )
      ).rows[0]
      const topUpReview = (
        await db.query(
          `select public.admin_review_manual_payment(
             $1,$2,'confirmed',2900,0,'',null,null
           ) as result`,
          [admin, topUpAttempt.id],
        )
      ).rows[0].result
      assert.equal(topUpReview.outcome, "confirmed")
      assert.equal(topUpReview.won, true)

      assert.deepEqual(
        (
          await db.query(
            "select draft_snapshot from public.manual_payment_attempts where id=$1",
            [submittedAttempt.id],
          )
        ).rows[0].draft_snapshot,
        initial,
      )
      assert.deepEqual(
        (
          await db.query(
            "select id,attempt_id,version,object_path,content_type,size_bytes,sha256,transfer_reference from public.payment_receipts where id=$1",
            [receipt],
          )
        ).rows[0],
        submittedReceiptAudit,
      )
      assert.deepEqual(
        (
          await db.query(
            `select id,receipt_id,outcome,received_amount_sen,credited_amount_sen,
                    remaining_amount_sen,excess_amount_sen,reason,evidence_object_path,
                    evidence_content_type,evidence_size_bytes,evidence_sha256
               from public.manual_payment_reviews where receipt_id=$1`,
            [receipt],
          )
        ).rows[0],
        insufficientReviewAudit,
      )
      assert.deepEqual(
        (
          await db.query(
            "select draft_snapshot from public.manual_payment_attempts where id=$1",
            [topUpAttempt.id],
          )
        ).rows[0].draft_snapshot,
        insufficientDraft,
      )
      assert.deepEqual(
        (
          await db.query(
            "select id,attempt_id,version,object_path,content_type,size_bytes,sha256,transfer_reference from public.payment_receipts where id=$1",
            [topUpReceipt],
          )
        ).rows[0],
        topUpReceiptAudit,
      )

      const manualPaymentRow = (
        await db.query(
          "select o.status,o.manual_paid_draft,c.is_published,c.custom_data_draft is not null as has_draft from public.orders o join public.cards c on c.order_id=o.id where o.id=$1",
          [manualOrder],
        )
      ).rows[0]
      assert.deepEqual(
        manualPaymentRow,
        { status: "paid", manual_paid_draft: true, is_published: false, has_draft: true },
      )

      // Public RLS sees no private paid draft, while an administrative/customer
      // read path does not mutate the customer activity timestamp.
      await db.exec("set role anon")
      assert.equal(
        (
          await db.query("select count(*)::int as count from public.cards where id=$1", [manualCard])
        ).rows[0].count,
        0,
      )
      await db.exec("reset role")
      await db.query("select public.finalize_paid_order($1)", [manualOrder])
      const activityBeforeFinalSave = (
        await db.query("select last_activity_at from public.cards where id=$1", [manualCard])
      ).rows[0].last_activity_at
      assert.ok(activityBeforeFinalSave)
      const manualLatest = {
        templateId: template,
        schemaVersion: 2,
        sections: [{ type: "landing", data: { headline: "Manual latest saved copy" } }],
      }
      const manualSave = (
        await db.query("select public.save_card_draft($1,$2,$3,4) as result", [
          manualCard,
          owner,
          JSON.stringify(manualLatest),
        ])
      ).rows[0].result
      assert.equal(manualSave.saved, true)
      assert.equal(manualSave.draftVersion, 5)
      const manualPublished = (
        await db.query("select public.publish_paid_draft($1,$2,$3,5) as result", [
          manualCard,
          owner,
          "I understand that this invitation will become public and read-only.",
        ])
      ).rows[0].result
      assert.equal(manualPublished.published, true)
      assert.deepEqual(
        (
          await db.query("select custom_data,custom_data_draft,is_published from public.cards where id=$1", [manualCard])
        ).rows[0],
        { custom_data: manualLatest, custom_data_draft: null, is_published: true },
      )
      assert.equal(
        (
          await db.query(
            "select count(*)::int as count from public.card_publication_actions where card_id=$1",
            [manualCard],
          )
        ).rows[0].count,
        1,
      )
      assert.equal(
        new Date(
          (
            await db.query("select last_activity_at from public.cards where id=$1", [stripeCard])
          ).rows[0].last_activity_at,
        ).toISOString(),
        new Date(activity).toISOString(),
      )

      // A normal unpaid card remains deletable after a successful draft save.
      // Its edit activity is not payment evidence and must cascade with the
      // card; paid/history-protected rows remain restricted below.
      await db.query(
        "insert into public.orders(id,user_id,template_id,status,price_myr,custom_data) values($1,$2,$3,'pending',4900,$4)",
        [unpaidDeleteOrder, owner, template, JSON.stringify(initial)],
      )
      await db.query(
        "insert into public.cards(id,order_id,user_id,template_id,slug,custom_data,custom_data_draft) values($1,$2,$3,$4,$5,$6,$6)",
        [unpaidDeleteCard, unpaidDeleteOrder, owner, template, `unpaid-delete-${unpaidDeleteCard}`, JSON.stringify(initial)],
      )
      const unpaidSave = (
        await db.query("select public.save_card_draft($1,$2,$3,1) as result", [
          unpaidDeleteCard,
          owner,
          JSON.stringify(latest),
        ])
      ).rows[0].result
      assert.equal(unpaidSave.saved, true)
      assert.equal(
        (
          await db.query("select public.delete_card_if_editing($1,$2) as deleted", [unpaidDeleteCard, owner])
        ).rows[0].deleted,
        true,
      )
      assert.equal(
        (
          await db.query("select count(*)::int as count from public.cards where id=$1 or order_id=$2", [unpaidDeleteCard, unpaidDeleteOrder])
        ).rows[0].count,
        0,
      )

      // The legacy submission trigger follows the same policy: its immutable
      // payment record does not freeze the owner's live draft, while deletion
      // remains audit-protected after any submission.
      const legacySnapshot = {
        slotNumber: 1,
        version: 1,
        payeeName: "Payee",
        qrImageUrl: "https://example.test/qr.png",
        provider: "Touch ’n Go",
        instructions: "Transfer",
      }
      await db.query(
        "insert into public.orders(id,user_id,template_id,status,price_myr,custom_data) values($1,$2,$3,'pending',4900,$4)",
        [legacyOrder, owner, template, JSON.stringify(initial)],
      )
      await db.query(
        "insert into public.cards(id,order_id,user_id,template_id,slug,custom_data,custom_data_draft) values($1,$2,$3,$4,$5,$6,$6)",
        [legacyCard, legacyOrder, owner, template, `legacy-review-${legacyCard}`, JSON.stringify(initial)],
      )
      const legacySubmission = randomUUID()
      await db.query(
        `insert into public.duitnow_transfer_submissions(
           id,order_id,user_id,slot_number,slot_version,slot_snapshot,
           amount_sen,transfer_reference,draft_snapshot
         ) values($1,$2,$3,1,1,$4,4900,'LEGACY-REF-1',$5)`,
        [legacySubmission, legacyOrder, owner, JSON.stringify(legacySnapshot), JSON.stringify(initial)],
      )
      const legacyDraft = {
        templateId: template,
        schemaVersion: 2,
        sections: [{ type: "landing", data: { headline: "Legacy review edit" } }],
      }
      const legacySave = (
        await db.query("select public.save_card_draft($1,$2,$3,1) as result", [
          legacyCard,
          owner,
          JSON.stringify(legacyDraft),
        ])
      ).rows[0].result
      assert.equal(legacySave.saved, true)
      assert.equal(legacySave.draftVersion, 2)
      assert.deepEqual(
        (
          await db.query("select draft_snapshot from public.duitnow_transfer_submissions where id=$1", [legacySubmission])
        ).rows[0].draft_snapshot,
        initial,
      )
      await assert.rejects(
        db.query("delete from public.cards where id=$1", [legacyCard]),
        /IMMUTABLE_PAYMENT_AUDIT_PROTECTED/,
      )
    } finally {
      await db.close()
    }
  },
)
