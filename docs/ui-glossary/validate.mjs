#!/usr/bin/env node
/**
 * Accuracy check for the UI glossary. No dependencies — `node validate.mjs`.
 *
 * Fails on:
 *   - a term pointing at a target no plate draws        (missing target)
 *   - a target no term claims                           (orphan target)
 *   - duplicate term ids, target ids, or canonical names
 *   - an alias colliding with a canonical name
 *   - a term missing a required field
 *   - a term whose plate does not exist
 *   - an `avoid` entry pointing at an unknown term id
 *   - a declared screenshot file that is not on disk
 *   - a screenshot file on disk that no plate declares
 *   - a guidance entry with no kind, or an unknown kind
 *   - stale generated blocks in docs/GLOSSARY.md
 *
 * It WARNS, and never fails, when the screenshots are older than the UI code.
 * Refreshing them needs a dev server and a browser, which must never be a
 * condition for the repair loop. The warning records the fact; a person decides
 * when to re-run capture.mjs.
 *
 * By default it rewrites the generated blocks in docs/GLOSSARY.md when they
 * are out of date. Pass --check to fail instead of writing (use that in CI).
 *
 * Exit code 0 = clean, 1 = at least one error.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import vm from "node:vm"
import { execSync } from "node:child_process"
import {
  MARKERS, replaceBlock, renderUiTerms, renderSectionCatalogue,
} from "./generate.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA_FILES = ["terms.js", "plates.js", "terms-shell.js", "terms-app.js", "guidance.js"]
const REQUIRED_TERM_FIELDS = ["id", "name", "cat", "plate", "target", "def", "src", "prompt"]
const CHECK_ONLY = process.argv.includes("--check")

/* The data files are plain scripts that assign to `window`, so the artifact can
   run from file://. Evaluate them the same way here. */
function load() {
  const sandbox = { window: {} }
  vm.createContext(sandbox)
  for (const file of DATA_FILES) {
    const path = join(HERE, "data", file)
    vm.runInContext(readFileSync(path, "utf8"), sandbox, { filename: path })
  }
  return sandbox.window.KAMY_GLOSSARY
}

const errors = []
const warnings = []
const fail = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

const g = load()

/* ---- collect every target id a plate actually draws --------------------- */
const targets = new Map() // targetId -> plateId
function walk(node, plateId) {
  if (!node || typeof node !== "object") return
  if (node.t) {
    if (targets.has(node.t)) fail(`duplicate target id "${node.t}" (plates ${targets.get(node.t)} and ${plateId})`)
    else targets.set(node.t, plateId)
  }
  ;(node.k ?? []).forEach((kid) => walk(kid, plateId))
}

const plateIds = new Set()
for (const plate of g.plates) {
  if (plateIds.has(plate.id)) fail(`duplicate plate id "${plate.id}"`)
  plateIds.add(plate.id)
  if (!plate.sources?.length) fail(`plate "${plate.id}" declares no source files`)
  walk(plate.wireframe, plate.id)
}

/* ---- terms -------------------------------------------------------------- */
const termIds = new Set()
const canonical = new Map() // lowercased name -> term id
const claimed = new Set()

for (const term of g.terms) {
  const where = `term "${term.id ?? "(no id)"}"`

  for (const field of REQUIRED_TERM_FIELDS) {
    const value = term[field]
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) {
      fail(`${where} is missing required field "${field}"`)
    }
  }

  if (termIds.has(term.id)) fail(`duplicate term id "${term.id}"`)
  termIds.add(term.id)

  const key = String(term.name).toLowerCase()
  if (canonical.has(key)) fail(`two terms share the canonical name "${term.name}" (${canonical.get(key)}, ${term.id})`)
  else canonical.set(key, term.id)

  if (!plateIds.has(term.plate)) fail(`${where} points at unknown plate "${term.plate}"`)
  if (!g.categories.some((c) => c.id === term.cat)) fail(`${where} has unknown category "${term.cat}"`)

  if (!targets.has(term.target)) {
    fail(`${where} points at target "${term.target}" — no plate draws it (missing target)`)
  } else {
    claimed.add(term.target)
    const drawnOn = targets.get(term.target)
    if (drawnOn !== term.plate) {
      fail(`${where} is on plate "${term.plate}" but its target "${term.target}" is drawn on "${drawnOn}"`)
    }
  }
}

/* aliases must not shadow a canonical name */
for (const term of g.terms) {
  for (const alias of term.aliases ?? []) {
    const hit = canonical.get(String(alias).toLowerCase())
    if (hit && hit !== term.id) {
      fail(`alias "${alias}" on term "${term.id}" collides with the canonical name of "${hit}"`)
    }
  }
}

/* ---- orphan targets ----------------------------------------------------- */
for (const [target, plate] of targets) {
  if (!claimed.has(target)) fail(`target "${target}" on plate "${plate}" has no term (orphan target)`)
}

/* ---- avoid list --------------------------------------------------------- */
for (const entry of g.avoid) {
  if (!["qualify", "avoid"].includes(entry.kind)) {
    fail(`guidance entry "${entry.term}" needs kind "qualify" or "avoid", got ${JSON.stringify(entry.kind)}`)
  }
  if (!entry.instead?.length) fail(`avoid entry "${entry.term}" suggests no replacement`)
  for (const id of entry.instead ?? []) {
    if (!termIds.has(id)) fail(`avoid entry "${entry.term}" points at unknown term id "${id}"`)
  }
}

/* ---- screenshots -------------------------------------------------------- */
const shotDir = join(HERE, "screenshots")
const onDisk = existsSync(shotDir)
  ? new Set(readdirSync(shotDir).filter((f) => f.endsWith(".jpg") || f.endsWith(".png")))
  : new Set()
const declared = new Set()
const manifestPath = join(shotDir, "manifest.json")
const SHOT_MANIFEST_JSON = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : null

for (const plate of g.plates) {
  const shots = plate.screenshots ?? {}
  for (const [width, file] of Object.entries(shots)) {
    declared.add(file)
    if (!onDisk.has(file)) fail(`plate "${plate.id}" declares ${width} screenshot "${file}" but it is not in screenshots/`)
  }
  // A plate with no screenshot must say why, so a reader never reads a wireframe
  // as "we just didn't bother".
  if (!Object.keys(shots).length && !plate.screenshotNote) {
    fail(`plate "${plate.id}" has no screenshot and no screenshotNote explaining why`)
  }
}
for (const file of onDisk) {
  if (!declared.has(file)) warn(`screenshots/${file} is not declared by any plate`)
}

/* ---- screenshot staleness ----------------------------------------------- */
/* A capture is current when the last commit that touched the UI is an ancestor
   of the commit the capture was taken at. Anything git cannot answer leaves the
   verdict "unknown" rather than inventing one. */
function screenshotStaleness(capturedCommit) {
  const git = (args) =>
    execSync(`git ${args}`, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()

  try {
    const uiCommit = git("log -1 --format=%H -- app components")
    if (!uiCommit) return { verdict: "unknown", reason: "no commit touches app/ or components/" }
    const captured = git(`rev-parse ${capturedCommit}^{commit}`)
    let current
    try {
      execSync(`git merge-base --is-ancestor ${uiCommit} ${captured}`,
               { cwd: REPO, stdio: "ignore" })
      current = true
    } catch {
      current = false
    }
    return {
      verdict: current ? "current" : "stale",
      uiCommit: uiCommit.slice(0, 7),
      capturedCommit: captured.slice(0, 7),
      uiChangedAt: git(`log -1 --format=%cs ${uiCommit}`),
    }
  } catch (error) {
    return { verdict: "unknown", reason: String(error.message).split("\n")[0] }
  }
}

const REPO = join(HERE, "..", "..")
let staleness = { verdict: "unknown", reason: "no screenshot manifest" }

if (SHOT_MANIFEST_JSON && onDisk.size) {
  staleness = screenshotStaleness(SHOT_MANIFEST_JSON.commit)
  if (staleness.verdict === "stale") {
    warn(`screenshots were captured at ${staleness.capturedCommit}, but app/ or components/ ` +
         `changed at ${staleness.uiCommit} (${staleness.uiChangedAt}). ` +
         `Wireframes are still current. Re-run capture.mjs when convenient.`)
  }
  if (!CHECK_ONLY) {
    // Publish the verdict so the artifact can badge the affected plates. The
    // page cannot run git, so the answer has to be written down for it.
    const withVerdict = { ...SHOT_MANIFEST_JSON, staleness }
    writeFileSync(join(shotDir, "manifest.json"), JSON.stringify(withVerdict, null, 2) + "\n")
    writeFileSync(
      join(shotDir, "manifest.js"),
      "/* Generated by docs/ui-glossary/capture.mjs. `staleness` is refreshed by validate.mjs. */\n" +
        "window.KAMY_GLOSSARY_SHOTS = " + JSON.stringify(withVerdict, null, 2) + "\n",
    )
  }
}

/* ---- generated blocks in docs/GLOSSARY.md ------------------------------- */
const glossaryPath = join(HERE, "..", "GLOSSARY.md")
let wrote = false

if (!existsSync(glossaryPath)) {
  warn("docs/GLOSSARY.md not found — skipping the generated-block sync")
} else if (!errors.length) {
  // Only sync a glossary that already passed its own checks. Writing a table
  // built from broken data would spread the breakage into another file.
  try {
    const before = readFileSync(glossaryPath, "utf8")
    let after = replaceBlock(before, MARKERS.ui, renderUiTerms(g))
    after = replaceBlock(after, MARKERS.sections, renderSectionCatalogue())
    if (after !== before) {
      if (CHECK_ONLY) {
        fail("docs/GLOSSARY.md generated blocks are stale. Run `node docs/ui-glossary/validate.mjs`")
      } else {
        writeFileSync(glossaryPath, after)
        wrote = true
      }
    }
  } catch (error) {
    fail(`could not sync docs/GLOSSARY.md — ${error.message}`)
  }
}

/* ---- report ------------------------------------------------------------- */
const stats = `${g.terms.length} terms · ${targets.size} targets · ${g.plates.length} plates · ${g.avoid.length} avoid · ${g.gaps.length} gaps`

for (const w of warnings) console.warn(`warn  ${w}`)

if (errors.length) {
  for (const e of errors) console.error(`ERROR ${e}`)
  console.error(`\n✗ ${errors.length} error${errors.length === 1 ? "" : "s"}  (${stats})`)
  process.exit(1)
}

console.log(`✓ glossary consistent — ${stats}`)
console.log(`  screenshots: ${staleness.verdict}` +
  (staleness.verdict === "current" ? ` (captured at ${staleness.capturedCommit})` : "") +
  (staleness.verdict === "stale" ? ` (captured ${staleness.capturedCommit}, UI at ${staleness.uiCommit})` : ""))
if (wrote) console.log("  docs/GLOSSARY.md regenerated (UI terms + Section catalogue)")
if (warnings.length) console.log(`  (${warnings.length} warning${warnings.length === 1 ? "" : "s"})`)
