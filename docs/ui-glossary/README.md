# UI glossary

A visual glossary of the kamy jemput interface, for people and agents who write
UI prompts. A leader line connects every canonical term to the exact part it
names.

Most bad UI prompts fail on naming, not on reasoning. "Fix the preview" is
ambiguous across four surfaces in this repo. "The Gaya picker" names two
different controls on the same screen.

## Where the terms end up

This folder is the **source**. The published output is `docs/GLOSSARY.md`.

| Reader | Opens |
|---|---|
| A person | `docs/ui-glossary/index.html`. Wireframes, connectors, search, full definitions. |
| An agent | `docs/GLOSSARY.md`. A table of names, kinds, files, and aliases. |

`docs/GLOSSARY.md` also holds two hand-written sections this folder does not
own: **Core concepts** and **Malaysian event terms**.

## Viewing it

Open `docs/ui-glossary/index.html` in a browser. No server, no build step, no
dependency. It runs from `file://` because the data files are plain scripts that
assign to `window`.

```sh
xdg-open docs/ui-glossary/index.html    # linux
open     docs/ui-glossary/index.html    # macos
```

Press `/` to search. `Tab` moves through terms and through the parts in the
wireframe. `Enter` selects. `Esc` clears. Every term has a link:
`index.html#variant-gallery` opens straight to it.

## What is on screen

**Plate.** One documented interface, drawn as a wireframe. A wireframe is a
reconstruction built from the source files listed under it. It is never a
screenshot, and the plate says so.

**Screenshot view.** Five plates have a real capture. The view shows the capture
date, the commit, and the route. The other four plates say why no capture
exists.

**Desktop 1280 and Mobile 390.** The wireframe's simulated viewport. Connectors
re-solve at both, so you can check that a term still points at the right part
when the layout moves. A part the product does not render at that width shows
`hidden at 1280` or `hidden at 390` and draws no line.

**Words that misfire.** Two groups. *Qualify* means the word is real but names
more than one thing. *Avoid* means nothing here answers to it.

**Not yet named.** Recorded gaps. Better than a confident wrong answer.

## Why the wireframes carry the connectors

The code computes leader lines from `getBoundingClientRect()` against real DOM
elements. Lines stay correct when the plate reflows, when a filter hides a term,
and when the viewport changes. Coordinates pinned to a bitmap would break on the
first re-render, and you could not check them at two widths. Screenshots are
evidence, not the connector surface.

## Files

| Path | What it is |
|---|---|
| `index.html` | Entry point. Structure only. |
| `glossary.css` | The tool's own styling. |
| `wireframe.css` | The plate mocks and their simulated-width rules. |
| `glossary.js` | Rendering, search, connectors, keyboard. |
| `data/terms.js` | Metadata, categories, empty collections. **Loads first.** |
| `data/plates.js` | One wireframe per interface, as declarative node trees. |
| `data/terms-shell.js` | Site shell, gallery, template detail, card preview. |
| `data/terms-app.js` | Published card, editor, dashboard, checkout, admin. |
| `data/guidance.js` | Words that misfire, and coverage gaps. |
| `generate.mjs` | Builds the two generated sections of `docs/GLOSSARY.md`. |
| `validate.mjs` | The accuracy check, plus the sync. Zero dependencies. |
| `capture.mjs` | Regenerates the reference screenshots. |
| `screenshots/` | Captures, plus `manifest.json` and `manifest.js`. |

## The one command

```sh
node docs/ui-glossary/validate.mjs
```

It checks the glossary, then rewrites the **UI terms** and **Section catalogue**
sections of `docs/GLOSSARY.md`. Pass `--check` to fail on a stale file instead
of writing it. Use `--check` in CI.

It fails on:

1. A term whose target no plate draws, or a target no term claims.
2. Duplicate ids, duplicate canonical names, or an alias that shadows a name.
3. A missing required field, or a guidance entry without `kind`.
4. A declared screenshot that is not on disk.
5. A plate with no screenshot and no note explaining why.

## Updating it when the UI changes

Treat a stale glossary as a bug, the same way `CLAUDE.md` treats a stale
`docs/FLOW.md`.

### A part was renamed, moved, or restyled

Edit its term in `data/terms-shell.js` or `data/terms-app.js`. Keep the `id`
stable so old anchors and old prompts still resolve. Change `name` only if the
canonical name changed, and move the old name into `aliases`.

### A new part needs a name

Add both halves. The check validates them as a pair.

```js
// data/plates.js. Draw it, and give it a stable target id
{ c: "wf-minibtn", t: "dash.export-button", x: "Eksport CSV" }
```
```js
// data/terms-app.js
{ id: "export-button", name: "Export button", cat: "control",
  plate: "dashboard", target: "dash.export-button",
  def: "…", src: ["app/(dashboard)/dashboard/page.tsx"],
  aliases: [], prompt: "Move the export button next to the RSVP counters." }
```

Target ids use `<plate-prefix>.<part>`. Terms sit in reading order within a
plate. That order numbers the markers, so insert a new term where it belongs on
screen, not at the end.

### A part was deleted

Remove the term and its target. Removing one half fails the check, by design.

### A word became ambiguous

Add it to `avoid` in `data/guidance.js`. Set `kind: "qualify"` if the word names
something real. Set `kind: "avoid"` if nothing here answers to it.

### Something is out of scope

Add it to `gaps` instead of guessing at it.

## Adding a Section

You do not touch this folder. Register the Section in
`lib/sections/registry.ts`, then run `validate.mjs`. It reads the registry and
rewrites the Section catalogue table in `docs/GLOSSARY.md`.

## Re-shooting the screenshots

Only when a captured route changes visually.

```sh
npm run dev                                             # port 3000, another shell
CHROME_PATH=/usr/bin/chromium node docs/ui-glossary/capture.mjs
```

`CHROME_PATH` is optional. It reuses a system Chromium instead of downloading
Playwright's. Playwright is already a devDependency, so this adds nothing to the
project. The script captures only public routes with no side effects. See the
note at the top of `capture.mjs`.

Then bump `meta.derivedFrom` in `data/terms.js` to the commit you read the UI
at, so the masthead does not overstate how current the terms are.

## Verification status

Checked in Chromium at 1440x1000, 1024x900, and 390x850. All nine plates render
at both simulated widths. Every label either draws a line to a rendered target
or shows that the part is absent at that width. No stray lines outside the
plate. No console errors. No horizontal page overflow at 390px. 394 leader-line
endpoints were checked to land inside the box of the part they name.
