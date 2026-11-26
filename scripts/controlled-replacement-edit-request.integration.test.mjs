import assert from "node:assert/strict"
import { execFileSync, spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { resolve } from "node:path"
import test from "node:test"
import { createClient } from "@supabase/supabase-js"

import {
  assertLocalSupabaseTarget,
  readAuthorizedLocalEnv,
  requireLoopbackAppUrl,
  runAuthorizedSql,
} from "./local-supabase-target.mjs"

const ACK = "I understand that this invitation will become public and read-only."
const PNG_BYTES = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
)

function readHostTarget() {
  const workdir = resolve(process.env.SUPABASE_EXPECTED_WORKDIR ?? "")
  const configPath = resolve(process.env.SUPABASE_EXPECTED_CONFIG_PATH ?? "")
  const projectId = process.env.SUPABASE_EXPECTED_PROJECT_ID
  const apiPort = Number(process.env.SUPABASE_EXPECTED_API_PORT)
  const dbPort = Number(process.env.SUPABASE_EXPECTED_DB_PORT)
  const container = process.env.SUPABASE_EXPECTED_CONTAINER
  assert.ok(workdir && configPath && projectId && container, "explicit host target is required")
  assert.equal(resolve(process.cwd()), workdir)
  assert.equal(configPath, resolve(workdir, ".supabase-worktree/supabase/config.toml"))
  const config = readFileSync(configPath, "utf8")
  assert.equal(config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1], projectId)
  assert.equal(Number(config.match(/\[api\][\s\S]*?^port\s*=\s*(\d+)/m)?.[1]), apiPort)
  assert.equal(Number(config.match(/\[db\][\s\S]*?^port\s*=\s*(\d+)/m)?.[1]), dbPort)
  assert.equal(container, `supabase_db_${projectId}`)
  assert.equal(execFileSync("docker", ["inspect", "-f", "{{.Name}}", container], { encoding: "utf8" }).trim(), `/${container}`)
  const labels = execFileSync("docker", ["inspect", "-f", "{{.Config.Labels}}", container], { encoding: "utf8" })
  assert.match(labels, new RegExp(`com\\.supabase\\.cli\\.project:${projectId}`))
  assert.match(
    labels,
    new RegExp(`com\\.supabase\\.cli\\.workdir:${resolve(workdir, ".supabase-worktree").replaceAll("/", "\\/")}`),
  )
  assert.match(
    execFileSync("docker", ["port", container, "5432/tcp"], { encoding: "utf8" }),
    new RegExp(`^0\\.0\\.0\\.0:${dbPort}$`, "m"),
  )
  const password = execFileSync(
    "docker",
    ["inspect", "-f", "{{range .Config.Env}}{{println .}}{{end}}", container],
    { encoding: "utf8" },
  ).match(/^POSTGRES_PASSWORD=(.*)$/m)?.[1]
  assert.ok(password, "isolated DB password is unavailable")
  const probe = execFileSync(
    "psql",
    ["-X", "-h", "127.0.0.1", "-p", String(dbPort), "-U", "postgres", "-d", "postgres", "-At", "-c", "select 1"],
    { encoding: "utf8", env: { ...process.env, PGPASSWORD: password } },
  ).trim()
  assert.equal(probe, "1")
  return { container, dbPort, password }
}

function assertRaceTarget() {
  if (process.env.CONTROLLED_REPLACEMENT_EDIT_REQUESTS_HOST_PSQL === "1") return readHostTarget()
  return assertLocalSupabaseTarget()
}

function runRaceSql(sql) {
  const target = assertRaceTarget()
  if (process.env.CONTROLLED_REPLACEMENT_EDIT_REQUESTS_HOST_PSQL !== "1") return runAuthorizedSql(sql)
  return execFileSync(
    "psql",
    ["-X", "-h", "127.0.0.1", "-p", String(target.dbPort), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
    { input: sql, encoding: "utf8", env: { ...process.env, PGPASSWORD: target.password } },
  ).trim()
}

function spawnPsql(sql, readyMarker = null, applicationName = null) {
  const hostTransport = process.env.CONTROLLED_REPLACEMENT_EDIT_REQUESTS_HOST_PSQL === "1"
  const target = assertRaceTarget()
  let command
  let args
  const env = { ...process.env }
  if (hostTransport) {
    command = "psql"
    args = ["-X", "-h", "127.0.0.1", "-p", String(target.dbPort), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"]
    env.PGPASSWORD = target.password
  } else {
    command = "docker"
    args = ["exec", "-i", target.container]
    if (applicationName) args.push("env", `PGAPPNAME=${applicationName}`)
    args.push("psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At")
  }
  if (hostTransport && applicationName) env.PGAPPNAME = applicationName
  const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], env })
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
  const done = new Promise((resolve, reject) => {
    child.on("error", (error) => {
      if (rejectReady) rejectReady(error)
      reject(error)
    })
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
      if (readyMarker && !readySeen && stdout.includes(readyMarker)) {
        readySeen = true
        resolveReady()
      }
    })
    child.stderr.on("data", (chunk) => { stderr += chunk.toString() })
    child.on("close", (code, signal) => {
      if (readyMarker && !readySeen) {
        rejectReady(new Error(`lock holder exited before marker (${code}): ${stdout}\n${stderr}`))
      }
      resolve({ code, signal, stdout, stderr, text: `${stdout}\n${stderr}` })
    })
  })
  child.stdin.end(sql)
  return { child, ready, done }
}

function waitForReady(processHandle) {
  return Promise.race([
    processHandle.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error("lock holder did not acquire its rows")), 5000)),
  ])
}

function waitForResult(promise, timeoutMs = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("database race timed out")), timeoutMs)),
  ])
}

test("combined #75/#80 lifecycle and entitlement invariants", {
  skip: process.env.CONTROLLED_REPLACEMENT_EDIT_REQUESTS_TEST_LOCAL !== "1",
}, () => {
  assertRaceTarget()
  const sql = readFileSync("scripts/controlled-replacement-edit-request.integration.sql", "utf8")
  assert.match(runRaceSql(sql), /issue75-80 combined replacement\/edit-request acceptance passed/)
})

function setupRequestFixture(label) {
  const owner = randomUUID()
  const admin = randomUUID()
  const slug = `issue75-80-${label}-${randomUUID().replaceAll("-", "")}`
  const adminName = `Issue75_80_${label}_Admin`
  const replacementOrder = randomUUID()
  const replacementCard = randomUUID()
  const replacementSlug = `${slug}-replacement`
  const setup = runRaceSql(`
begin;
insert into auth.users(id,email,aud,role,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('${owner}','${slug}-owner@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp()),
  ('${admin}','${slug}-admin@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp());
insert into public.users(id,email,name,role)
values
  ('${owner}','${slug}-owner@example.test','Issue75_80_${label}_Owner','customer'),
  ('${admin}','${slug}-admin@example.test','${adminName}','admin')
on conflict (id) do update set email=excluded.email, name=excluded.name, role=excluded.role;
set local role service_role;
do $$
declare
  v_created jsonb;
  v_card public.cards%rowtype;
begin
  v_created := public.create_draft_order_and_card('malay-wedding','${owner}','${slug}')::jsonb;
  update public.orders
     set status='paid', manual_paid_draft=true, payment_method='stripe', payment_completed_at=clock_timestamp()
   where id=(v_created->>'orderId')::uuid;
  perform public.publish_paid_draft((v_created->>'cardId')::uuid,'${owner}'::uuid,
    '${ACK}',1);
  select * into v_card from public.cards where id=(v_created->>'cardId')::uuid;
  perform public.submit_card_edit_request(v_card.id,'${owner}'::uuid,'Race request','${randomUUID()}'::uuid);
end
$$;
select format('REQUEST_RACE|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s',
  c.id,c.order_id,
  (select id from public.card_edit_requests where card_id=c.id and status='pending'),
  '${admin}'::uuid,c.current_publication_id,
  '${replacementOrder}'::uuid,'${replacementCard}'::uuid,'${replacementSlug}','${adminName}',
  '${owner}'::uuid)
from public.cards c where c.slug='${slug}';
commit;
`)
  const line = setup.split(/\r?\n/).map((value) => value.trim()).find((value) => value.startsWith("REQUEST_RACE|"))
  assert.ok(line, `request race fixture did not return identifiers: ${setup}`)
  const [
    , sourceCard, sourceOrder, requestRow, adminId, publicationId,
    replacementOrderId, replacementCardId, replacementSlugId, fixtureAdminName, ownerId,
  ] = line.split("|")
  return {
    sourceCard,
    sourceOrder,
    requestRow,
    adminId,
    publicationId,
    replacementOrder: replacementOrderId,
    replacementCard: replacementCardId,
    replacementSlug: replacementSlugId,
    adminName: fixtureAdminName,
    ownerId,
  }
}

function prepareReplacementFixture(fixture) {
  const setup = runRaceSql(`
begin;
do $$
declare
  v_publication public.card_publications%rowtype;
  v_grant jsonb;
  v_target public.cards%rowtype;
begin
  select * into v_publication
    from public.card_publications where id='${fixture.publicationId}'::uuid;
  v_grant := public.create_card_replacement_grant(
    '${fixture.sourceCard}'::uuid,'${fixture.adminId}'::uuid,'Prepared cutover grant',gen_random_uuid(),
    '${fixture.replacementOrder}'::uuid,'${fixture.replacementCard}'::uuid,
    '${fixture.replacementSlug}',v_publication.snapshot,v_publication.id
  );
  perform public.plan_card_replacement_assets(
    (v_grant->>'grantId')::uuid,v_publication.id,'[]'::jsonb
  );
  select * into v_target from public.cards where id='${fixture.replacementCard}'::uuid;
  perform public.finalize_card_replacement_assets(
    (v_grant->>'grantId')::uuid,v_publication.id,v_target.custom_data_draft,v_target.draft_version
  );
end
$$;
select format('PREPARED|%s|%s|%s|%s',
  (select id from public.card_replacement_grants where replacement_card_id='${fixture.replacementCard}'::uuid),
  '${fixture.replacementCard}'::uuid,
  (select order_id from public.cards where id='${fixture.replacementCard}'::uuid),
  (select draft_version from public.cards where id='${fixture.replacementCard}'::uuid));
commit;
`)
  const line = setup.split(/\r?\n/).map((value) => value.trim()).find((value) => value.startsWith("PREPARED|"))
  assert.ok(line, `prepared replacement fixture did not return identifiers: ${setup}`)
  const [, grantId, targetCard, targetOrder, targetVersion] = line.split("|")
  return { ...fixture, grantId, targetCard, targetOrder, targetVersion }
}

function lockSourceRows(fixture) {
  return `
select id from public.orders where id='${fixture.sourceOrder}'::uuid for update;
select id from public.cards where id='${fixture.sourceCard}'::uuid for update;
`
}

function lockReplacementRows(fixture) {
  return `
select id from public.orders
 where id in ('${fixture.sourceOrder}'::uuid,'${fixture.targetOrder}'::uuid)
 order by id for update;
select id from public.cards
 where id in ('${fixture.sourceCard}'::uuid,'${fixture.targetCard}'::uuid)
 order by id for update;
`
}

function reviewCall(fixture) {
  return `select public.review_card_edit_request(
    '${fixture.requestRow}'::uuid,'${fixture.adminId}'::uuid,'approve',null,'${randomUUID()}'::uuid
  );`
}

function grantCall(fixture) {
  return `select public.create_card_replacement_grant(
    '${fixture.sourceCard}'::uuid,'${fixture.adminId}'::uuid,'Contended initial replacement grant',
    '${randomUUID()}'::uuid,'${fixture.replacementOrder}'::uuid,'${fixture.replacementCard}'::uuid,
    '${fixture.replacementSlug}',
    (select snapshot from public.card_publications where id='${fixture.publicationId}'::uuid),
    '${fixture.publicationId}'::uuid
  );`
}

function cutoverCall(fixture) {
  return `select public.cutover_card_replacement(
    '${fixture.grantId}'::uuid,'${fixture.adminId}'::uuid,'Contended replacement cutover',
    '${randomUUID()}'::uuid,'${fixture.publicationId}'::uuid,${fixture.targetVersion}
  );`
}

function releaseBarrier(fixture, releaseName) {
  return `
select 'HOLDER_LOCKED';
do $$
begin
  for v_attempt in 1..200 loop
    exit when exists (
      select 1 from public.users
       where id='${fixture.adminId}'::uuid and name='${releaseName}'
    );
    perform pg_sleep(0.05);
  end loop;
  if exists (
    select 1 from public.users
     where id='${fixture.adminId}'::uuid and name='${releaseName}'
  ) then
    return;
  end if;
  raise exception 'HOLDER_RELEASE_TIMEOUT';
end
$$;
`
}

async function cleanupChild(processHandle) {
  if (!processHandle) return
  try {
    await waitForResult(processHandle.done, 2000)
    return
  } catch {
    processHandle.child.kill("SIGTERM")
  }
  try {
    await waitForResult(processHandle.done, 2000)
  } catch {
    processHandle.child.kill("SIGKILL")
  }
}

async function runBlockedScenario(fixture, lockSql, holderAction, contenderAction) {
  const releaseName = `Issue75_80_${randomUUID().replaceAll("-", "")}_Released`
  const holderApplicationName = `issue75-80-holder-${randomUUID()}`
  const contenderApplicationName = `issue75-80-contender-${randomUUID()}`
  const observerApplicationName = `issue75-80-observer-${randomUUID()}`
  const holder = spawnPsql(`
begin;
set local statement_timeout='15s';
${lockSql}
${releaseBarrier(fixture, releaseName)}
${holderAction}
commit;
`, "HOLDER_LOCKED", holderApplicationName)
  let contender
  let observer
  let observerResult
  let failure
  try {
    await waitForReady(holder)
    contender = spawnPsql(`set statement_timeout='10s'; ${contenderAction}`, null, contenderApplicationName)
    observer = spawnPsql(`
set statement_timeout='15s';
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
`, null, observerApplicationName)
    observerResult = await waitForResult(observer.done, 15000)
  } catch (error) {
    failure = error
  } finally {
    try {
      runRaceSql(
        `update public.users set name='${releaseName}' where id='${fixture.adminId}'::uuid and name='${fixture.adminName}';`,
      )
    } catch (error) {
      failure ??= error
    }
  }
  if (failure) {
    await Promise.all([cleanupChild(observer), cleanupChild(contender), cleanupChild(holder)])
    throw failure
  }
  let results
  try {
    results = await Promise.all([
      waitForResult(holder.done),
      waitForResult(contender.done),
    ])
  } catch (error) {
    await Promise.all([cleanupChild(observer), cleanupChild(contender), cleanupChild(holder)])
    throw error
  }
  const [holderResult, contenderResult] = results
  return { holderResult, contenderResult, observerResult }
}

function assertObservedBlock(race) {
  assert.equal(race.observerResult.code, 0, race.observerResult.text)
  assert.match(race.observerResult.text, /CONTENDER_BLOCKED/)
  assert.equal(race.holderResult.code, 0, race.holderResult.text)
}

test("approval, cutover, and initial replacement grant contend behind observed locks", {
  skip: process.env.CONTROLLED_REPLACEMENT_EDIT_REQUESTS_TEST_LOCAL !== "1",
}, async () => {
  assertRaceTarget()

  const approvalFirstGrant = setupRequestFixture("approval-first-grant")
  const approvalFirstGrantRace = await runBlockedScenario(
    approvalFirstGrant,
    lockSourceRows(approvalFirstGrant),
    reviewCall(approvalFirstGrant),
    grantCall(approvalFirstGrant),
  )
  assertObservedBlock(approvalFirstGrantRace)
  assert.match(approvalFirstGrantRace.holderResult.stdout, /"status": ?"approved"/)
  assert.notEqual(approvalFirstGrantRace.contenderResult.code, 0)
  assert.match(approvalFirstGrantRace.contenderResult.text, /PREDECESSOR_NOT_AVAILABLE/)
  assert.equal(
    runRaceSql(`
      select r.status || '|' ||
        (select count(*) from public.card_edit_windows where card_id='${approvalFirstGrant.sourceCard}') || '|' ||
        (select count(*) from public.card_replacement_grants where predecessor_card_id='${approvalFirstGrant.sourceCard}')
      from public.card_edit_requests r where r.id='${approvalFirstGrant.requestRow}';
    `),
    "approved|1|0",
  )

  const grantFirstApproval = setupRequestFixture("grant-first-approval")
  const grantFirstApprovalRace = await runBlockedScenario(
    grantFirstApproval,
    lockSourceRows(grantFirstApproval),
    grantCall(grantFirstApproval),
    reviewCall(grantFirstApproval),
  )
  assertObservedBlock(grantFirstApprovalRace)
  assert.match(grantFirstApprovalRace.holderResult.stdout, /"replayed": ?false/)
  assert.equal(grantFirstApprovalRace.contenderResult.code, 0, grantFirstApprovalRace.contenderResult.text)
  assert.match(grantFirstApprovalRace.contenderResult.stdout, /"status": ?"stale"/)
  assert.equal(
    runRaceSql(`
      select r.status || '|' ||
        (select count(*) from public.card_edit_windows where card_id='${grantFirstApproval.sourceCard}') || '|' ||
        (select count(*) from public.card_replacement_grants where predecessor_card_id='${grantFirstApproval.sourceCard}') || '|' ||
        c.is_published::text
      from public.card_edit_requests r
      join public.cards c on c.id='${grantFirstApproval.sourceCard}'
      where r.id='${grantFirstApproval.requestRow}';
    `),
    "stale|0|1|true",
  )

  const approvalFirstCutover = prepareReplacementFixture(setupRequestFixture("approval-first-cutover"))
  const approvalFirstCutoverRace = await runBlockedScenario(
    approvalFirstCutover,
    lockSourceRows(approvalFirstCutover),
    reviewCall(approvalFirstCutover),
    cutoverCall(approvalFirstCutover),
  )
  assertObservedBlock(approvalFirstCutoverRace)
  assert.match(approvalFirstCutoverRace.holderResult.stdout, /"status": ?"stale"/)
  assert.equal(approvalFirstCutoverRace.contenderResult.code, 0, approvalFirstCutoverRace.contenderResult.text)
  assert.match(approvalFirstCutoverRace.contenderResult.stdout, /"retired": ?true/)
  assert.equal(
    runRaceSql(`
      select r.status || '|' || public.card_is_retired(c.id)::text || '|' ||
        (select count(*) from public.card_edit_windows where card_id='${approvalFirstCutover.sourceCard}') || '|' ||
        (select count(*) from public.card_replacement_cutovers where grant_id='${approvalFirstCutover.grantId}') || '|' ||
        c.is_published::text || '|' ||
        (select is_published::text from public.cards where id='${approvalFirstCutover.targetCard}')
      from public.card_edit_requests r
      join public.cards c on c.id='${approvalFirstCutover.sourceCard}'
      where r.id='${approvalFirstCutover.requestRow}';
    `),
    "stale|true|0|1|false|true",
  )

  const cutoverFirstApproval = prepareReplacementFixture(setupRequestFixture("cutover-first-approval"))
  const cutoverFirstApprovalRace = await runBlockedScenario(
    cutoverFirstApproval,
    lockReplacementRows(cutoverFirstApproval),
    cutoverCall(cutoverFirstApproval),
    reviewCall(cutoverFirstApproval),
  )
  assertObservedBlock(cutoverFirstApprovalRace)
  assert.match(cutoverFirstApprovalRace.holderResult.stdout, /"retired": ?true/)
  assert.equal(cutoverFirstApprovalRace.contenderResult.code, 0, cutoverFirstApprovalRace.contenderResult.text)
  assert.match(cutoverFirstApprovalRace.contenderResult.stdout, /"status": ?"stale"/)
  assert.equal(
    runRaceSql(`
      select r.status || '|' || public.card_is_retired(c.id)::text || '|' ||
        (select count(*) from public.card_edit_windows where card_id=c.id) || '|' ||
        (select count(*) from public.card_replacement_cutovers where grant_id='${cutoverFirstApproval.grantId}') || '|' ||
        c.is_published::text || '|' ||
        (select is_published::text from public.cards where id='${cutoverFirstApproval.targetCard}')
      from public.card_edit_requests r
      join public.cards c on c.id='${cutoverFirstApproval.sourceCard}'
      where r.id='${cutoverFirstApproval.requestRow}';
    `),
    "stale|true|0|1|false|true",
  )
})

test("retired predecessor stays private across storage, guest HTML/metadata, OG and RSVP", {
  skip: process.env.CONTROLLED_REPLACEMENT_EDIT_REQUESTS_TEST_LOCAL !== "1"
    || !process.env.CONTROLLED_REPLACEMENT_EDIT_REQUESTS_TEST_APP_URL,
}, async () => {
  assertLocalSupabaseTarget()
  const localEnv = readAuthorizedLocalEnv()
  const appUrl = requireLoopbackAppUrl("CONTROLLED_REPLACEMENT_EDIT_REQUESTS_TEST_APP_URL")
  const admin = createClient(
    localEnv.NEXT_PUBLIC_SUPABASE_URL,
    localEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const ownerStorage = createClient(
    localEnv.NEXT_PUBLIC_SUPABASE_URL,
    localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const [{ data: owner, error: ownerError }, { data: administrator, error: adminError }] = await Promise.all([
    admin.from("users").select("id").eq("email", "kamy@gmail.com").single(),
    admin.from("users").select("id").eq("email", "kamy.admin@gmail.com").single(),
  ])
  assert.ifError(ownerError)
  assert.ifError(adminError)
  assert.ok(owner?.id && administrator?.id)
  const { error: signInError } = await ownerStorage.auth.signInWithPassword({
    email: "kamy@gmail.com",
    password: "123",
  })
  assert.ifError(signInError)

  const slug = `issue75-80-retired-${randomUUID().replaceAll("-", "")}`
  const created = await admin.rpc("create_draft_order_and_card", {
    p_template_id: "malay-wedding-v2",
    p_owner: owner.id,
    p_slug: slug,
  })
  assert.ifError(created.error)
  assert.ok(created.data?.cardId && created.data?.orderId)
  const { data: initial, error: initialError } = await admin
    .from("cards")
    .select("custom_data_draft,draft_version")
    .eq("id", created.data.cardId)
    .single()
  assert.ifError(initialError)
  const filename = `retired-${randomUUID()}.png`
  const sourcePath = `${created.data.cardId}/landing/${filename}`
  const draft = structuredClone(initial.custom_data_draft)
  const marker = `Retired boundary ${randomUUID()}`
  const landing = draft.sections.find((section) => section.type === "landing")
  const eventInfo = draft.sections.find((section) => section.type === "event_info")
  assert.ok(landing && eventInfo)
  landing.data.coverPhotoUrl = `/api/card-assets/${created.data.cardId}/landing/${filename}`
  eventInfo.data.eventName = marker
  const saved = await admin.rpc("save_card_draft", {
    p_card_id: created.data.cardId,
    p_owner: owner.id,
    p_draft: draft,
    p_expected_draft_version: initial.draft_version,
  })
  assert.ifError(saved.error)
  const { error: sourceUploadError } = await admin.storage.from("card-assets").upload(
    sourcePath,
    new Blob([PNG_BYTES], { type: "image/png" }),
    { upsert: false, contentType: "image/png", cacheControl: "no-store" },
  )
  assert.ifError(sourceUploadError)
  const reference = `issue75-80-retired-${randomUUID()}`
  const { error: orderError } = await admin
    .from("orders")
    .update({ stripe_session_id: reference })
    .eq("id", created.data.orderId)
  assert.ifError(orderError)
  const completed = await admin.rpc("complete_order_payment", {
    p_order_id: created.data.orderId,
    p_method: "stripe",
    p_reference: reference,
    p_draft_snapshot: null,
  })
  assert.ifError(completed.error)
  assert.equal(completed.data?.won, true)
  const { data: paidCard, error: paidCardError } = await admin
    .from("cards")
    .select("draft_version,current_publication_id,custom_data")
    .eq("id", created.data.cardId)
    .single()
  assert.ifError(paidCardError)
  const firstPublication = await admin.rpc("publish_paid_draft", {
    p_card_id: created.data.cardId,
    p_owner: owner.id,
    p_acknowledgement: ACK,
    p_expected_draft_version: paidCard.draft_version,
  })
  assert.ifError(firstPublication.error)
  assert.equal(firstPublication.data?.published, true)
  const publication = await admin.from("card_publications")
    .select("id,snapshot")
    .eq("id", firstPublication.data.publicationId)
    .single()
  assert.ifError(publication.error)

  const targetCardId = randomUUID()
  const targetOrderId = randomUUID()
  const targetDraft = structuredClone(publication.data.snapshot)
  const targetLanding = targetDraft.sections.find((section) => section.type === "landing")
  assert.ok(targetLanding)
  targetLanding.data.coverPhotoUrl = `/api/card-assets/${targetCardId}/landing/${filename}`
  const grant = await admin.rpc("create_card_replacement_grant", {
    p_predecessor_card_id: created.data.cardId,
    p_admin_id: administrator.id,
    p_reason: "Retired guest boundary regression",
    p_request_id: randomUUID(),
    p_replacement_order_id: targetOrderId,
    p_replacement_card_id: targetCardId,
    p_slug: `${slug}-replacement`,
    p_replacement_draft: targetDraft,
    p_expected_source_publication_id: publication.data.id,
  })
  assert.ifError(grant.error)
  assert.ok(grant.data?.grantId)
  const targetPath = `${targetCardId}/landing/${filename}`
  const plan = await admin.rpc("plan_card_replacement_assets", {
    p_grant_id: grant.data.grantId,
    p_source_publication_id: publication.data.id,
    p_assets: [{
      sourceObjectPath: sourcePath,
      targetObjectPath: targetPath,
      sha256: "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
      sizeBytes: PNG_BYTES.byteLength,
      contentType: "image/png",
    }],
  })
  assert.ifError(plan.error)
  const { error: targetUploadError } = await admin.storage.from("card-assets").upload(
    targetPath,
    new Blob([PNG_BYTES], { type: "image/png" }),
    { upsert: false, contentType: "image/png", cacheControl: "no-store" },
  )
  assert.ifError(targetUploadError)
  const ready = await admin.rpc("mark_card_replacement_asset_ready", {
    p_grant_id: grant.data.grantId,
    p_source_object_path: sourcePath,
    p_sha256: "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
    p_size_bytes: PNG_BYTES.byteLength,
    p_content_type: "image/png",
  })
  assert.ifError(ready.error)
  const { data: target, error: targetError } = await admin
    .from("cards")
    .select("custom_data_draft,draft_version")
    .eq("id", targetCardId)
    .single()
  assert.ifError(targetError)
  const prepared = await admin.rpc("finalize_card_replacement_assets", {
    p_grant_id: grant.data.grantId,
    p_source_publication_id: publication.data.id,
    p_target_draft: target.custom_data_draft,
    p_expected_draft_version: target.draft_version,
  })
  assert.ifError(prepared.error)
  const cutover = await admin.rpc("cutover_card_replacement", {
    p_grant_id: grant.data.grantId,
    p_admin_id: administrator.id,
    p_reason: "Retired guest boundary regression",
    p_request_id: randomUUID(),
    p_expected_source_publication_id: publication.data.id,
    p_expected_replacement_draft_version: target.draft_version,
  })
  assert.ifError(cutover.error)
  assert.equal(cutover.data?.result?.retired, true)

  const afterRetirementUpload = await ownerStorage.storage.from("card-assets").upload(
    `${created.data.cardId}/landing/after-retirement-${randomUUID()}.png`,
    new Blob([PNG_BYTES], { type: "image/png" }),
    { upsert: false, contentType: "image/png", cacheControl: "no-store" },
  )
  assert.ok(afterRetirementUpload.error, "retired predecessor upload must be denied")

  const page = await fetch(new URL(`/i/${slug}`, appUrl), {
    headers: { "Cache-Control": "no-cache" },
  })
  assert.ok([200, 404].includes(page.status), `retired page returned ${page.status}`)
  const pageBody = await page.text()
  assert.doesNotMatch(pageBody, new RegExp(marker.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")))
  assert.match(pageBody, /Jemputan tidak dijumpai|not found/i)

  const og = await fetch(new URL(`/i/${slug}/opengraph-image`, appUrl), {
    headers: { "Cache-Control": "no-cache" },
  })
  assert.ok([200, 404].includes(og.status), `retired OG returned ${og.status}`)
  if (og.status === 200) {
    assert.match(og.headers.get("content-type") ?? "", /image\/png/)
    assert.match(og.headers.get("cache-control") ?? "", /no-store/)
  }

  const asset = await fetch(new URL(`/api/card-assets/${created.data.cardId}/landing/${filename}`, appUrl))
  assert.equal(asset.status, 404)
  const rsvp = await fetch(new URL(`/api/rsvp/${created.data.cardId}`, appUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ guestName: "Retired Guest", attending: true }),
  })
  assert.equal(rsvp.status, 404)
})
