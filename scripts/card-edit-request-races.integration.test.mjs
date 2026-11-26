import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import test from "node:test"
import { assertLocalSupabaseTarget, runAuthorizedSql } from "./local-supabase-target.mjs"

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function spawnPsql(sql, readyMarker = null, applicationName = null) {
  const { container } = assertLocalSupabaseTarget()
  const args = ["exec", "-i", container]
  if (applicationName) args.push("env", `PGAPPNAME=${applicationName}`)
  args.push("psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At")
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] })
  let stdout = ""
  let stderr = ""
  let readySeen = false
  let resolveReady
  let rejectReady
  const ready = readyMarker
    ? new Promise((resolve, reject) => {
        resolveReady = resolve
        rejectReady = reject
      })
    : Promise.resolve()
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString()
    if (readyMarker && !readySeen && stdout.includes(readyMarker)) {
      readySeen = true
      resolveReady()
    }
  })
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString()
  })
  const done = new Promise((resolve, reject) => {
    child.on("error", (error) => {
      if (rejectReady) rejectReady(error)
      reject(error)
    })
    child.on("close", (code, signal) => {
      if (readyMarker && !readySeen) {
        rejectReady(new Error(`race holder exited before marker (${code}): ${stdout}\n${stderr}`))
      }
      resolve({ code, signal, stdout, stderr, text: `${stdout}\n${stderr}` })
    })
  })
  child.stdin.end(sql)
  return { ready, done }
}

async function waitForReady(processHandle) {
  await Promise.race([
    processHandle.ready,
    wait(5000).then(() => {
      throw new Error("race holder did not acquire its row locks")
    }),
  ])
}

function setupFixture(label = "race") {
  const owner = randomUUID()
  const admin = randomUUID()
  const secondAdmin = randomUUID()
  const slug = `issue80-${label}-${randomUUID().replaceAll("-", "")}`
  const requestId = randomUUID()
  const sql = `
begin;
insert into auth.users(id,email,aud,role,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('${owner}','${slug}-owner@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp()),
       ('${admin}','${slug}-admin@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp()),
       ('${secondAdmin}','${slug}-admin-2@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp());
insert into public.users(id,email,name,role)
values ('${owner}','${slug}-owner@example.test','Issue 80 Race Owner','customer'),
       ('${admin}','${slug}-admin@example.test','Issue 80 Race Admin','admin'),
       ('${secondAdmin}','${slug}-admin-2@example.test','Issue 80 Race Admin Two','admin')
on conflict (id) do update set email=excluded.email, name=excluded.name, role=excluded.role;
do $$
declare v_created jsonb; v_card uuid; v_order uuid;
begin
  v_created := public.create_draft_order_and_card('malay-wedding','${owner}','${slug}')::jsonb;
  v_card := (v_created->>'cardId')::uuid;
  v_order := (v_created->>'orderId')::uuid;
  update public.orders set status='paid', manual_paid_draft=true, payment_method='stripe', payment_completed_at=clock_timestamp() where id=v_order;
  perform public.publish_paid_draft(v_card,'${owner}','I understand that this invitation will become public and read-only.',1);
  perform public.submit_card_edit_request(v_card,'${owner}','Race correction', '${requestId}'::uuid);
end
$$;
commit;
select format('%s|%s|%s|%s|%s|%s',
  c.id,c.order_id,'${owner}'::uuid,'${admin}'::uuid,'${secondAdmin}'::uuid,
  (select id from public.card_edit_requests where request_id='${requestId}'::uuid))
from public.cards c where c.slug='${slug}';
`
  const line = runAuthorizedSql(sql)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.split("|").length === 6)
  assert.ok(line, "race fixture did not return all identifiers")
  const [cardId, orderId, ownerId, adminId, secondAdminId, requestRowId] = line.split("|")
  return { cardId, orderId, ownerId, adminId, secondAdminId, requestRowId }
}

function lockPrefix(fixture) {
  return `
begin;
select order_id as locked_order_id from public.cards where id='${fixture.cardId}' \\gset
select id from public.orders where id=:'locked_order_id' for update;
select id from public.cards where id='${fixture.cardId}' for update;
`
}

async function runBlockedReview(fixture) {
  const releaseName = `Issue 80 released ${randomUUID()}`
  const holderApplicationName = `issue80-holder-${randomUUID()}`
  const contenderApplicationName = `issue80-contender-${randomUUID()}`
  const observerApplicationName = `issue80-observer-${randomUUID()}`
  const decisionId = randomUUID()
  const holder = spawnPsql(
    `${lockPrefix(fixture)}
select 'HOLDER_LOCKED';
do $$
begin
  loop
    exit when exists (
      select 1 from public.users where id='${fixture.adminId}' and name='${releaseName}'
    );
    perform pg_sleep(0.05);
  end loop;
end
$$;
commit;
`,
    "HOLDER_LOCKED",
    holderApplicationName,
  )
  await waitForReady(holder)
  const contender = spawnPsql(
    `select public.review_card_edit_request('${fixture.requestRowId}','${fixture.adminId}','approve',null,'${decisionId}');`,
    null,
    contenderApplicationName,
  )
  const observer = spawnPsql(
    `
do $$
begin
  for v_attempt in 1..200 loop
    if exists (
      select 1 from pg_stat_activity
       where application_name='${contenderApplicationName}'
         and state='active'
         and wait_event_type='Lock'
    ) then
      raise notice 'CONTENDER_BLOCKED';
      return;
    end if;
    perform pg_sleep(0.05);
  end loop;
  raise exception 'CONTENDER_NOT_BLOCKED';
end
$$;
`,
    null,
    observerApplicationName,
  )
  let observerResult
  try {
    observerResult = await observer.done
  } finally {
    runAuthorizedSql(
      `update public.users set name='${releaseName}' where id='${fixture.adminId}' and name='Issue 80 Race Admin';`,
    )
  }
  const [holderResult, contenderResult] = await Promise.all([holder.done, contender.done])
  return { observerResult, holderResult, contenderResult }
}

test("issue 80 approval waits behind order/card locks", async () => {
  assertLocalSupabaseTarget()
  const fixture = setupFixture("blocked")
  const race = await runBlockedReview(fixture)
  assert.equal(race.observerResult.code, 0, race.observerResult.text)
  assert.match(race.observerResult.stderr, /CONTENDER_BLOCKED/)
  assert.equal(race.holderResult.code, 0, race.holderResult.text)
  assert.equal(race.contenderResult.code, 0, race.contenderResult.text)
  assert.match(race.contenderResult.stdout, /"status": ?"approved"/)
  assert.match(
    runAuthorizedSql(`
      select c.is_published::text || '|' || r.status || '|' ||
        (select count(*) from public.card_edit_windows where card_id=c.id)
      from public.cards c
      join public.card_edit_requests r on r.id='${fixture.requestRowId}'
      where c.id='${fixture.cardId}';
    `),
    /^false\|approved\|1$/,
  )
})

async function runConcurrentDecisions(fixture, firstDecision, secondDecision) {
  const first = spawnPsql(
    `select public.review_card_edit_request('${fixture.requestRowId}','${fixture.adminId}','${firstDecision}',${firstDecision === "reject" ? "'Customer-safe rejection'" : "null"},'${randomUUID()}');`,
  )
  const second = spawnPsql(
    `select public.review_card_edit_request('${fixture.requestRowId}','${fixture.secondAdminId}','${secondDecision}',${secondDecision === "reject" ? "'Another customer-safe rejection'" : "null"},'${randomUUID()}');`,
  )
  return Promise.all([first.done, second.done])
}

test("concurrent approve/reject and two-admin approval produce one terminal outcome", async () => {
  assertLocalSupabaseTarget()
  const mixedFixture = setupFixture("mixed")
  const mixed = await runConcurrentDecisions(mixedFixture, "approve", "reject")
  const mixedSuccesses = mixed.filter((result) => result.code === 0)
  assert.equal(mixedSuccesses.length, 1, mixed.map((result) => result.text).join("\n"))
  assert.match(mixed.find((result) => result.code !== 0)?.text ?? "", /REQUEST_ALREADY_DECIDED/)
  assert.match(
    runAuthorizedSql(`
      select r.status || '|' || (select count(*) from public.card_edit_windows where card_id='${mixedFixture.cardId}')
      from public.card_edit_requests r where r.id='${mixedFixture.requestRowId}';
    `),
    /^(approved\|1|rejected\|0)$/,
  )

  const approvalFixture = setupFixture("two-admin")
  const approvals = await runConcurrentDecisions(approvalFixture, "approve", "approve")
  const approvalSuccesses = approvals.filter((result) => result.code === 0)
  assert.equal(approvalSuccesses.length, 1, approvals.map((result) => result.text).join("\n"))
  assert.match(approvals.find((result) => result.code !== 0)?.text ?? "", /REQUEST_ALREADY_DECIDED/)
  assert.equal(
    runAuthorizedSql(`select count(*) from public.card_edit_windows where card_id='${approvalFixture.cardId}';`),
    "1",
  )
})
