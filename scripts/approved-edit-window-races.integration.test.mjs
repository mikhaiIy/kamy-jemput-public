import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import test from "node:test"
import { assertLocalSupabaseTarget, runAuthorizedSql } from "./local-supabase-target.mjs"

const ACK = "I understand that this invitation will become public and read-only."

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function spawnPsql(sql, readyMarker = null, applicationName = null) {
  const { container } = assertLocalSupabaseTarget()
  const psqlArgs = ["exec", "-i", container]
  if (applicationName) psqlArgs.push("env", `PGAPPNAME=${applicationName}`)
  psqlArgs.push("psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At")
  const child = spawn(
    "docker",
    psqlArgs,
    { stdio: ["pipe", "pipe", "pipe"] },
  )
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
        rejectReady(new Error(`concurrency holder exited before lock marker (${code}): ${stdout}\n${stderr}`))
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
      throw new Error("concurrency holder did not acquire its row lock")
    }),
  ])
}

function setupFixture({ activeWindow, savedRevision }) {
  const owner = randomUUID()
  const admin = randomUUID()
  const slug = `issue74-race-${randomUUID().replaceAll("-", "")}`
  const reason = "Concurrent edit-window test"
  const draft = JSON.stringify({
    templateId: "malay-wedding",
    schemaVersion: 2,
    eventName: slug,
    sections: [],
  })
  const sql = `
begin;
insert into auth.users(id,email,aud,role,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('${owner}','${slug}-owner@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp()),
       ('${admin}','${slug}-admin@example.test','authenticated','authenticated','x','{"provider":"email"}','{}',clock_timestamp(),clock_timestamp());
insert into public.users(id,email,name,role)
values ('${owner}','${slug}-owner@example.test','Race Owner','customer'),
       ('${admin}','${slug}-admin@example.test','Race Admin','admin')
on conflict (id) do update set email = excluded.email, name = excluded.name, role = excluded.role;
create temporary table issue74_race_fixture(card_id uuid, order_id uuid, owner_id uuid, admin_id uuid, window_id uuid, draft_version bigint);
do $$
declare
  v_created jsonb;
  v_window jsonb;
  v_card_id uuid;
  v_order_id uuid;
  v_version bigint;
begin
  v_created := public.create_draft_order_and_card('malay-wedding','${owner}','${slug}')::jsonb;
  v_card_id := (v_created->>'cardId')::uuid;
  v_order_id := (v_created->>'orderId')::uuid;
  update public.orders
     set status = 'paid', manual_paid_draft = true, payment_method = 'stripe', payment_completed_at = clock_timestamp()
   where id = v_order_id;
  perform public.publish_paid_draft(v_card_id,'${owner}','${ACK}',1);
  if ${activeWindow ? "true" : "false"} then
    v_window := public.open_card_edit_window(v_card_id,'${admin}','${reason}',gen_random_uuid())::jsonb;
    select draft_version into v_version from public.cards where id = v_card_id;
    if ${savedRevision ? "true" : "false"} then
      perform public.save_card_draft(v_card_id,'${owner}','${draft}'::jsonb,v_version);
    end if;
  end if;
  select draft_version into v_version from public.cards where id = v_card_id;
  insert into issue74_race_fixture(card_id,order_id,owner_id,admin_id,window_id,draft_version)
  values (v_card_id,v_order_id,'${owner}','${admin}',nullif(v_window->>'windowId','')::uuid,v_version);
end
$$;
commit;
select format('%s|%s|%s|%s|%s|%s',card_id,order_id,owner_id,admin_id,coalesce(window_id::text,''),draft_version)
  from issue74_race_fixture;
`
  const line = runAuthorizedSql(sql)
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.split("|").length === 6)
  assert.ok(line, "race fixture did not return its identifiers")
  const [cardId, orderId, fixtureOwner, fixtureAdmin, windowId, draftVersion] = line.split("|")
  return {
    cardId,
    orderId,
    ownerId: fixtureOwner,
    adminId: fixtureAdmin,
    windowId: windowId || null,
    draftVersion: Number(draftVersion),
    releaseName: `Race Released ${slug}`,
  }
}

function lockPrefix(fixture) {
  return `
begin;
select order_id as locked_order_id from public.cards where id = '${fixture.cardId}' \\gset
select id from public.orders where id = :'locked_order_id' for update;
select id from public.cards where id = '${fixture.cardId}' for update;
`
}

function releaseBarrier(fixture) {
  return `
select 'HOLDER_LOCKED';
do $$
begin
  loop
    exit when exists (
      select 1 from public.users where id = '${fixture.adminId}' and name = '${fixture.releaseName}'
    );
    perform pg_sleep(0.05);
  end loop;
end
$$;
`
}

async function runBlockedRace(fixture, holderSql, contenderSql) {
  const holderApplicationName = `issue74-holder-${randomUUID()}`
  const contenderApplicationName = `issue74-contender-${randomUUID()}`
  const observerApplicationName = `issue74-observer-${randomUUID()}`
  const holder = spawnPsql(holderSql, "HOLDER_LOCKED", holderApplicationName)
  await waitForReady(holder)
  const contender = spawnPsql(contenderSql, null, contenderApplicationName)
  const observer = spawnPsql(
    `
do $$
begin
  for v_attempt in 1..200 loop
    if exists (
      select 1
        from pg_stat_activity
       where application_name = '${contenderApplicationName}'
         and state = 'active'
         and wait_event_type = 'Lock'
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
      `update public.users set name = '${fixture.releaseName}' where id = '${fixture.adminId}' and name = 'Race Admin';`,
    )
  }
  const [holderResult, contenderResult] = await Promise.all([holder.done, contender.done])
  return { holderResult, contenderResult, observerResult }
}

test("issue 74 lifecycle transitions serialize across independent database connections", async () => {
  assertLocalSupabaseTarget()

  const grantFixture = setupFixture({ activeWindow: false, savedRevision: false })
  const grantRace = await runBlockedRace(
    grantFixture,
    `${lockPrefix(grantFixture)}
${releaseBarrier(grantFixture)}
select public.open_card_edit_window('${grantFixture.cardId}','${grantFixture.adminId}','First concurrent grant',gen_random_uuid());
commit;
`,
    `select public.open_card_edit_window('${grantFixture.cardId}','${grantFixture.adminId}','Second concurrent grant',gen_random_uuid());
`,
  )
  assert.equal(grantRace.observerResult.code, 0, grantRace.observerResult.text)
  assert.match(grantRace.observerResult.text, /CONTENDER_BLOCKED/)
  assert.equal(grantRace.holderResult.code, 0, grantRace.holderResult.text)
  assert.notEqual(grantRace.contenderResult.code, 0, "conflicting grant unexpectedly succeeded")
  assert.match(grantRace.contenderResult.text, /EDIT_WINDOW_ACTIVE/)
  assert.equal(
    Number(runAuthorizedSql(`select count(*) from public.card_edit_windows where card_id = '${grantFixture.cardId}';`)),
    1,
  )

  const saveFixture = setupFixture({ activeWindow: true, savedRevision: false })
  const saveRace = await runBlockedRace(
    saveFixture,
    `${lockPrefix(saveFixture)}
${releaseBarrier(saveFixture)}
select public.set_card_availability('${saveFixture.cardId}','${saveFixture.adminId}','disabled','Disable before save');
commit;
`,
    `select public.save_card_draft('${saveFixture.cardId}','${saveFixture.ownerId}',
      '{"templateId":"malay-wedding","schemaVersion":2,"eventName":"blocked save"}'::jsonb,
      ${saveFixture.draftVersion});
`,
  )
  assert.equal(saveRace.observerResult.code, 0, saveRace.observerResult.text)
  assert.match(saveRace.observerResult.text, /CONTENDER_BLOCKED/)
  assert.equal(saveRace.holderResult.code, 0, saveRace.holderResult.text)
  assert.notEqual(saveRace.contenderResult.code, 0, "save unexpectedly succeeded after disable")
  assert.match(saveRace.contenderResult.text, /CARD_UNAVAILABLE/)
  assert.match(
    runAuthorizedSql(`select is_published::text || '|' || coalesce((select action from public.card_availability_actions where card_id = '${saveFixture.cardId}' order by created_at desc, id desc limit 1),'') from public.cards where id = '${saveFixture.cardId}';`),
    /^false\|disabled$/,
  )

  const publishFixture = setupFixture({ activeWindow: true, savedRevision: true })
  const publishRace = await runBlockedRace(
    publishFixture,
    `${lockPrefix(publishFixture)}
${releaseBarrier(publishFixture)}
select public.set_card_availability('${publishFixture.cardId}','${publishFixture.adminId}','disabled','Disable before publish');
commit;
`,
    `select public.publish_card_revision('${publishFixture.cardId}','${publishFixture.ownerId}','${publishFixture.windowId}','${ACK}',${publishFixture.draftVersion});
`,
  )
  assert.equal(publishRace.observerResult.code, 0, publishRace.observerResult.text)
  assert.match(publishRace.observerResult.text, /CONTENDER_BLOCKED/)
  assert.equal(publishRace.holderResult.code, 0, publishRace.holderResult.text)
  assert.equal(publishRace.contenderResult.code, 0, publishRace.contenderResult.text)
  assert.match(publishRace.contenderResult.text, /"state"\s*:\s*"unavailable"/)
  assert.equal(
    Number(runAuthorizedSql(`select count(*) from public.card_publications where card_id = '${publishFixture.cardId}';`)),
    1,
  )
})
