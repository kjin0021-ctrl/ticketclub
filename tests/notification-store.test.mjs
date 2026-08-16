import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyLocalState, parseLocalState } from "../lib/local-store.ts";

test("new local state includes notification storage", () => {
  const state = createEmptyLocalState();
  assert.deepEqual(state.notifications, []);
  assert.deepEqual(state.sourceFailureCounts, {});
});

test("legacy local state migrates without losing data", () => {
  const legacy = createEmptyLocalState();
  delete legacy.notifications;
  delete legacy.sourceFailureCounts;
  const migrated = parseLocalState(JSON.stringify(legacy));
  assert.deepEqual(migrated.notifications, []);
  assert.deepEqual(migrated.sourceFailureCounts, {});
  assert.equal(migrated.artists.length, 1);
});
