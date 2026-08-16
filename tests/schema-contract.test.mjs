import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");

test("single-user schema covers the product decision chain", () => {
  for (const table of ["artists", "sources", "sourceItems", "events", "availabilityWindows", "feasibilityRuns", "spots", "notifications", "settings"]) {
    assert.match(schema, new RegExp(`export const ${table} = sqliteTable`));
  }
  assert.doesNotMatch(schema, /users\s*=\s*sqliteTable/);
});

test("event sources and deduplication are explicit", () => {
  assert.match(schema, /eventSourceItems/);
  assert.match(schema, /events_dedupe_unique/);
  assert.match(schema, /notGoingRetentionUntil/);
});

test("timing assumptions remain user-adjustable", () => {
  assert.match(schema, /airportAdvanceMinutes/);
  assert.match(schema, /immigrationMinutes/);
  assert.match(schema, /relaxedLeadMinutes/);
  assert.match(schema, /extremeLeadMinutes/);
});
