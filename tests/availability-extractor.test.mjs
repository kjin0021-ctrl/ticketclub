import assert from "node:assert/strict";
import test from "node:test";
import { extractAvailabilityFromText } from "../lib/availability-extractor.ts";

test("extracts a Chinese availability window and origin", () => {
  const result = extractAvailabilityFromText("2026年5月14日晚上7点之后可以离开墨尔本，2026年5月19日上午9点前要回到家", 2026);
  assert.equal(result.availableFrom, "2026-05-14T19:00");
  assert.equal(result.mustReturnBy, "2026-05-19T09:00");
  assert.equal(result.origin, "Melbourne CBD");
});

test("uses the event year when the user omits it", () => {
  const result = extractAvailabilityFromText("5月14日19:30有空，5月19日09:00前回来", 2026);
  assert.equal(result.availableFrom, "2026-05-14T19:30");
  assert.equal(result.mustReturnBy, "2026-05-19T09:00");
});
