import assert from "node:assert/strict"
import test from "node:test"

import { saveLatestThenNavigate } from "./section-editor-navigation.ts"

function deferred() {
  let resolve
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

test("an immediate status click saves the latest edit before navigating", async () => {
  const latest = { headline: "edited immediately" }
  const saved = []
  const events = []

  const navigated = await saveLatestThenNavigate({
    clearPendingSave: () => events.push("clear"),
    readLatest: () => latest,
    save: async (draft) => {
      saved.push(draft)
      events.push("saved")
    },
    navigate: () => events.push("navigate"),
    onSaving: () => events.push("saving"),
    onError: (error) => events.push(error),
  })

  assert.equal(navigated, true)
  assert.deepEqual(saved, [latest])
  assert.deepEqual(events, ["clear", "saving", "saved", "navigate"])
})

test("status navigation waits for an in-flight save", async () => {
  const saveGate = deferred()
  let navigated = false
  let saveStarted = false

  const navigation = saveLatestThenNavigate({
    clearPendingSave: () => {},
    readLatest: () => ({ headline: "in flight" }),
    save: async () => {
      saveStarted = true
      await saveGate.promise
    },
    navigate: () => {
      navigated = true
    },
    onSaving: () => {},
    onError: (error) => {
      throw error
    },
  })

  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(saveStarted, true)
  assert.equal(navigated, false)

  saveGate.resolve()
  assert.equal(await navigation, true)
  assert.equal(navigated, true)
})

test("a newer edit made during a save is flushed before navigation", async () => {
  const saveGate = deferred()
  let latest = { headline: "first edit" }
  const saved = []
  let navigated = false

  const navigation = saveLatestThenNavigate({
    clearPendingSave: () => {},
    readLatest: () => latest,
    save: async (draft) => {
      saved.push(draft)
      if (saved.length === 1) await saveGate.promise
    },
    navigate: () => {
      navigated = true
    },
    onSaving: () => {},
    onError: (error) => {
      throw error
    },
  })

  await new Promise((resolve) => setImmediate(resolve))
  latest = { headline: "newer edit" }
  saveGate.resolve()

  assert.equal(await navigation, true)
  assert.deepEqual(saved, [
    { headline: "first edit" },
    { headline: "newer edit" },
  ])
  assert.equal(navigated, true)
})

test("a failed save keeps the editor mounted and reports the error", async () => {
  const failure = new Error("save failed")
  let navigated = false
  let reported = null

  const result = await saveLatestThenNavigate({
    clearPendingSave: () => {},
    readLatest: () => ({ headline: "failed draft" }),
    save: async () => {
      throw failure
    },
    navigate: () => {
      navigated = true
    },
    onSaving: () => {},
    onError: (error) => {
      reported = error
    },
  })

  assert.equal(result, false)
  assert.equal(navigated, false)
  assert.equal(reported, failure)
})

test("an incomplete draft can open payment status without validation", async () => {
  const incompleteDraft = { sections: [{ type: "landing", data: {} }] }
  let savedDraft = null
  let navigated = false

  const result = await saveLatestThenNavigate({
    clearPendingSave: () => {},
    readLatest: () => incompleteDraft,
    save: async (draft) => {
      savedDraft = draft
    },
    navigate: () => {
      navigated = true
    },
    onSaving: () => {},
    onError: (error) => {
      throw error
    },
  })

  assert.equal(result, true)
  assert.deepEqual(savedDraft, incompleteDraft)
  assert.equal(navigated, true)
})
