import assert from "node:assert/strict"
import test from "node:test"

import { restoreSectionEditorCache } from "./section-editor-cache.ts"

const data = {
  templateId: "malay-wedding-v2",
  schemaVersion: 2,
  theme: {
    palette: "amber_rose",
    fonts: { display: "--font-playfair", body: "--font-jakarta" },
    animation: "fade",
    background: { kind: "solid", value: "#fdf6ec" },
  },
  sections: [
    {
      type: "landing",
      variant: "default",
      enabled: true,
      order: 0,
      data: { headline: "Latest local edit" },
    },
  ],
}

const currentVersion = 7

for (const paidDraft of [false, true]) {
  test(`${paidDraft ? "paid" : "unpaid"} matching versioned cache restores its data`, () => {
    assert.deepEqual(
      restoreSectionEditorCache(
        JSON.stringify({ data, draftVersion: currentVersion }),
        paidDraft,
        currentVersion,
      ),
      data,
    )
  })

  test(`${paidDraft ? "paid" : "unpaid"} stale versioned cache is rejected`, () => {
    assert.equal(
      restoreSectionEditorCache(
        JSON.stringify({ data, draftVersion: currentVersion - 1 }),
        paidDraft,
        currentVersion,
      ),
      null,
    )
  })

  test(`${paidDraft ? "paid" : "unpaid"} malformed cache is rejected`, () => {
    for (const malformed of [
      "{not-json",
      JSON.stringify({ data, draftVersion: "7" }),
      JSON.stringify({ data: { ...data, sections: "not-an-array" }, draftVersion: currentVersion }),
      JSON.stringify({ data }),
      JSON.stringify({ templateId: data.templateId, theme: data.theme, sections: [{}] }),
    ]) {
      assert.equal(
        restoreSectionEditorCache(malformed, paidDraft, currentVersion),
        null,
        malformed,
      )
    }
  })
}

test("unpaid editing preserves a structurally valid legacy raw cache", () => {
  assert.deepEqual(restoreSectionEditorCache(JSON.stringify(data), false, currentVersion), data)
})

test("paid drafts reject legacy raw caches without version proof", () => {
  assert.equal(restoreSectionEditorCache(JSON.stringify(data), true, currentVersion), null)
})
