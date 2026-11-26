import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"
import { runAuthorizedSql } from "./local-supabase-target.mjs"

test(
  "issue 74 approved edit windows: isolated real local DB acceptance",
  { skip: process.env.APPROVED_EDIT_WINDOWS_TEST_LOCAL !== "1" },
  () => {
    const sql = readFileSync(resolve("scripts/approved-edit-windows.integration.sql"), "utf8")
    const output = runAuthorizedSql(sql)
    assert.match(output, /issue74 approved edit-window acceptance passed/)
  },
)
