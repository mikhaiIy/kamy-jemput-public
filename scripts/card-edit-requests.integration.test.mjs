import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"
import { runAuthorizedSql } from "./local-supabase-target.mjs"

test(
  "issue 80 customer edit requests: isolated real local DB acceptance",
  { skip: process.env.CARD_EDIT_REQUESTS_TEST_LOCAL !== "1" },
  () => {
    const sql = readFileSync(resolve("scripts/card-edit-requests.integration.sql"), "utf8")
    const output = runAuthorizedSql(sql)
    assert.match(output, /issue80 card-edit-request acceptance passed/)
  },
)
