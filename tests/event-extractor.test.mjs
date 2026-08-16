import assert from "node:assert/strict";
import test from "node:test";
import { extractEventFromText } from "../lib/event-extractor.ts";

test("extracts a Korean fan meeting announcement without paid AI", () => {
  const result = extractEventFromText("Summer Memory Club FAN MEETING\n2026.08.29 18:00\nVenue: YES24 Live Hall, Seoul");
  assert.equal(result.eventType, "FAN MEETING");
  assert.equal(result.date, "2026-08-29");
  assert.equal(result.time, "18:00");
  assert.equal(result.venue, "YES24 Live Hall, Seoul");
  assert.equal(result.city, "Seoul");
  assert.equal(result.isLikelyEvent, true);
});

test("missing details remain visibly unconfirmed", () => {
  const result = extractEventFromText("New photos are out now");
  assert.equal(result.isLikelyEvent, false);
  assert.equal(result.confidence.date, "missing");
  assert.equal(result.confidence.venue, "missing");
});
