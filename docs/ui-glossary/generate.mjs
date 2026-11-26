/**
 * Generates the two machine-derived sections of docs/GLOSSARY.md.
 *
 *   ## UI terms          ← docs/ui-glossary/data/*.js
 *   ## Section catalogue ← lib/sections/registry.ts + components/sections/
 *
 * Both are written between HTML comment markers. Text outside the markers is
 * never touched, so the hand-written sections (core concepts, Malaysian event
 * terms) survive untouched.
 *
 * Called by validate.mjs — not usually run directly.
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import vm from "node:vm"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, "..", "..")
const DATA_FILES = ["terms.js", "plates.js", "terms-shell.js", "terms-app.js", "guidance.js"]

export const MARKERS = {
  ui: ["<!-- BEGIN GENERATED: ui-terms -->", "<!-- END GENERATED: ui-terms -->"],
  sections: ["<!-- BEGIN GENERATED: section-catalogue -->", "<!-- END GENERATED: section-catalogue -->"],
}

export function loadGlossary() {
  const sandbox = { window: {} }
  vm.createContext(sandbox)
  for (const file of DATA_FILES) {
    const path = join(HERE, "data", file)
    vm.runInContext(readFileSync(path, "utf8"), sandbox, { filename: path })
  }
  return sandbox.window.KAMY_GLOSSARY
}

/* ---------------------------------------------------------------- helpers */

const cell = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ")

/** Replace the text between two markers. Throws rather than guessing. */
export function replaceBlock(source, [open, close], body) {
  const start = source.indexOf(open)
  const end = source.indexOf(close)
  if (start === -1 || end === -1) throw new Error(`markers not found: ${open}`)
  if (end < start) throw new Error(`markers out of order: ${open}`)
  if (source.indexOf(open, start + 1) !== -1) throw new Error(`duplicate marker: ${open}`)
  return source.slice(0, start + open.length) + "\n" + body + "\n" + source.slice(end)
}

/* -------------------------------------------------------------- UI terms */

export function renderUiTerms(g) {
  const catLabel = Object.fromEntries(g.categories.map((c) => [c.id, c.label]))
  const byId = Object.fromEntries(g.terms.map((t) => [t.id, t.name]))

  const out = []
  out.push(
    `_Generated from \`docs/ui-glossary/data/\`. Do not edit by hand._`,
    `_${g.terms.length} terms across ${g.plates.length} interfaces. For definitions, wireframes, and connectors, open \`docs/ui-glossary/index.html\`._`,
    ``,
    `Use the canonical name when you write about the UI. Aliases are fine as input. Write the canonical name.`,
    ``,
  )

  for (const plate of g.plates) {
    const rows = g.terms.filter((t) => t.plate === plate.id)
    if (!rows.length) continue
    out.push(`### ${plate.name}`, `\`${plate.route}\``, ``)
    out.push(`| Canonical name | Kind | Lives in | Aliases | Definition |`, `|---|---|---|---|---|`)
    for (const t of rows) {
      out.push(
        `| **${cell(t.name)}** | ${cell(catLabel[t.cat])} | \`${cell(t.src[0])}\` | ${
          (t.aliases ?? []).length ? cell(t.aliases.join(", ")) : "none"
        } | ${cell(t.def)} |`,
      )
    }
    out.push(``)
  }

  const groups = [
    ["qualify", "Qualify. The word is real, but it names more than one thing."],
    ["avoid", "Avoid. Nothing in this codebase answers to it."],
  ]
  out.push(`### Words that misfire`, ``)
  for (const [kind, label] of groups) {
    const rows = g.avoid.filter((a) => a.kind === kind)
    if (!rows.length) continue
    out.push(`**${label}**`, ``)
    for (const a of rows) {
      const say = a.instead.map((id) => `**${byId[id]}**`).join(", ")
      out.push(`- \`${cell(a.term)}\`${a.domain ? " _(also in Core concepts)_" : ""}. ${cell(a.why)} Say: ${say}`)
    }
    out.push(``)
  }

  if (g.gaps.length) {
    out.push(`### Not yet named`, ``)
    for (const gap of g.gaps) out.push(`- **${cell(gap.area)}.** ${cell(gap.detail)} (\`${cell(gap.src)}\`)`)
    out.push(``)
  }

  return out.join("\n").trimEnd()
}

/* ----------------------------------------------------- Section catalogue */

/** Pull the registry's key order — that is the catalogue, in its real order. */
export function readRegistry() {
  const src = readFileSync(join(REPO, "lib/sections/registry.ts"), "utf8")
  const block = src.match(/export const sectionRegistry: SectionRegistry = \{([\s\S]*?)\n\}/)
  if (!block) throw new Error("could not find sectionRegistry in lib/sections/registry.ts")
  return [...block[1].matchAll(/^\s{2}([a-z_]+):/gm)].map((m) => m[1])
}

/** Read the facts a doc needs out of one Section module. */
export function readSectionModule(type) {
  const src = readFileSync(join(REPO, "components/sections", type, "index.tsx"), "utf8")

  const label = src.match(/label:\s*\{\s*en:\s*"([^"]+)",\s*ms:\s*"([^"]+)"\s*\}/)
  const defaultVariant = src.match(/defaultVariant:\s*"([^"]+)"/)
  // Two shapes in the wild: a single-line map, and a multi-line block. Try the
  // single-line form first — a greedy multi-line match would run past it and
  // swallow keys from whatever object comes next.
  const variantsBlock =
    src.match(/\n  variants:\s*\{([^{}\n]*)\},?\n/) ||
    src.match(/\n  variants:\s*\{([\s\S]*?)\n  \},?\n/)
  const hidden = src.match(/hiddenVariants:\s*\[([^\]]*)\]/)
  const tier = src.match(/\n  tier:\s*"([^"]+)"/)
  const repeatable = /\n  repeatable:\s*true/.test(src)
  const appliesAll = /\n  appliesTo:\s*"all"/.test(src)

  const variants = variantsBlock
    ? [...variantsBlock[1].matchAll(/(?:^|[{,])\s*([a-z_]+):/gm)].map((m) => m[1])
    : []
  const hiddenList = hidden ? [...hidden[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : []

  if (!label) throw new Error(`no label in components/sections/${type}/index.tsx`)
  if (!defaultVariant) throw new Error(`no defaultVariant in components/sections/${type}/index.tsx`)

  return {
    type,
    en: label[1],
    ms: label[2],
    defaultVariant: defaultVariant[1],
    variants: variants.filter((v) => !hiddenList.includes(v)),
    hidden: hiddenList,
    tier: tier ? tier[1] : "free",
    repeatable,
    appliesTo: appliesAll ? "all" : "some",
  }
}

export function renderSectionCatalogue() {
  const types = readRegistry()
  const mods = types.map(readSectionModule)

  const out = []
  out.push(
    `_Generated from \`lib/sections/registry.ts\`. Do not edit by hand._`,
    `_${mods.length} Sections. A Section is one content block on a card. A card is a stack of them._`,
    ``,
    `| \`type\` | Label (ms) | Label (en) | Variants | Default variant | Notes |`,
    `|---|---|---|---|---|---|`,
  )
  for (const m of mods) {
    const notes = []
    if (m.tier === "premium") notes.push("premium")
    if (m.repeatable) notes.push("repeatable")
    if (m.appliesTo !== "all") notes.push("limited to some template types")
    if (m.hidden.length) notes.push(`${m.hidden.length} legacy variant${m.hidden.length === 1 ? "" : "s"} hidden`)
    out.push(
      `| \`${m.type}\` | ${cell(m.ms)} | ${cell(m.en)} | ${m.variants.length} | \`${m.defaultVariant}\` | ${
        notes.length ? notes.join(", ") : "none"
      } |`,
    )
  }
  out.push(``, `Variant names live in each module's \`variants\` map: \`components/sections/<type>/index.tsx\`.`)
  return out.join("\n")
}
