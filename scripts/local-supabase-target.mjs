import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function requiredExpectation(name) {
  const value = process.env[name]?.trim()
  assert.ok(value, `${name} is required; the local target must be explicit`)
  return value
}

function readExpectedTarget() {
  const workdir = resolve(requiredExpectation("SUPABASE_EXPECTED_WORKDIR"))
  const configPath = resolve(requiredExpectation("SUPABASE_EXPECTED_CONFIG_PATH"))
  const projectId = requiredExpectation("SUPABASE_EXPECTED_PROJECT_ID")
  const apiPort = Number(requiredExpectation("SUPABASE_EXPECTED_API_PORT"))
  const dbPort = Number(requiredExpectation("SUPABASE_EXPECTED_DB_PORT"))
  const container = requiredExpectation("SUPABASE_EXPECTED_CONTAINER")

  assert.ok(Number.isInteger(apiPort) && apiPort > 0, "invalid SUPABASE_EXPECTED_API_PORT")
  assert.ok(Number.isInteger(dbPort) && dbPort > 0, "invalid SUPABASE_EXPECTED_DB_PORT")
  assert.equal(configPath, resolve(workdir, ".supabase-worktree/supabase/config.toml"))
  assert.equal(container, `supabase_db_${projectId}`)

  return { workdir, configPath, projectId, apiPort, dbPort, container }
}

function readConfig(configPath) {
  const source = readFileSync(configPath, "utf8")
  const projectId = source.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1]
  const apiPort = Number(source.match(/\[api\][\s\S]*?^port\s*=\s*(\d+)/m)?.[1])
  const dbPort = Number(source.match(/\[db\][\s\S]*?^port\s*=\s*(\d+)/m)?.[1])
  return { projectId, apiPort, dbPort }
}

function inspect(format, container) {
  return execFileSync("docker", ["inspect", "-f", format, container], {
    encoding: "utf8",
  }).trim()
}

/** Assert the exact managed worktree before any local Supabase operation. */
export function assertLocalSupabaseTarget() {
  const expected = readExpectedTarget()
  const currentWorkdir = resolve(process.cwd())
  const currentConfigPath = resolve(currentWorkdir, ".supabase-worktree/supabase/config.toml")
  assert.equal(currentWorkdir, expected.workdir, "wrong worktree for local Supabase operation")
  assert.equal(currentConfigPath, expected.configPath, "wrong managed Supabase config")
  const actual = readConfig(currentConfigPath)
  assert.equal(actual.projectId, expected.projectId, "unexpected local Supabase project")
  assert.equal(actual.apiPort, expected.apiPort, "unexpected local Supabase API port")
  assert.equal(actual.dbPort, expected.dbPort, "unexpected local Supabase DB port")

  const container = `supabase_db_${actual.projectId}`
  assert.equal(container, expected.container, "unexpected local Supabase DB container")
  assert.equal(inspect("{{.Name}}", container), `/${container}`, "wrong Supabase DB container")
  assert.equal(inspect("{{.State.Health.Status}}", container), "healthy", "Supabase DB is not healthy")
  assert.match(inspect("{{.Config.Labels}}", container), new RegExp(`com\\.supabase\\.cli\\.project:${actual.projectId}`))
  const worktreeDir = resolve(currentWorkdir, ".supabase-worktree")
  assert.match(
    inspect("{{.Config.Labels}}", container),
    new RegExp(`com\\.supabase\\.cli\\.workdir:${worktreeDir.replaceAll("/", "\\/")}`),
  )
  assert.match(
    execFileSync("docker", ["port", container, "5432/tcp"], { encoding: "utf8" }),
    new RegExp(`^0\\.0\\.0\\.0:${actual.dbPort}$`, "m"),
  )
  return { ...expected, ...actual, container, currentWorkdir, currentConfigPath }
}

export function readAuthorizedLocalEnv() {
  const target = assertLocalSupabaseTarget()
  const values = {}
  for (const line of readFileSync(resolve(target.currentWorkdir, ".env.local"), "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)\s*$/)
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, "")
  }
  const supabaseUrl = new URL(values.NEXT_PUBLIC_SUPABASE_URL ?? "")
  assert.equal(supabaseUrl.protocol, "http:", "Supabase tests must use the local HTTP API")
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(supabaseUrl.hostname), "hosted Supabase target is not allowed")
  assert.equal(Number(supabaseUrl.port), target.apiPort, "Supabase env URL does not match the active API port")
  assert.ok(values.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  assert.ok(values.SUPABASE_SERVICE_ROLE_KEY)
  return values
}

export function requireLoopbackAppUrl(name) {
  const raw = process.env[name]?.trim()
  assert.ok(raw, `${name} is required; the HTTP test target must be explicit`)
  const url = new URL(raw)
  assert.equal(url.protocol, "http:", `${name} must use local HTTP`)
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname), `${name} must target loopback`)
  return url
}

export function runAuthorizedSql(sql) {
  const { container } = assertLocalSupabaseTarget()
  return execFileSync(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
    { input: sql, encoding: "utf8" },
  ).trim()
}
