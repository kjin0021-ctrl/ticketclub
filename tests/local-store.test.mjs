import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyLocalState, createEventFingerprint, mergeConfirmedEvent, normalizeEventName, parseLocalState } from "../lib/local-store.ts";

test("creates a versioned single-user local state", () => {
  const state = createEmptyLocalState();
  assert.equal(state.version, 1);
  assert.deepEqual(state.attendanceByEvent, {});
  assert.deepEqual(state.availability, []);
  assert.equal(state.timeAssumptions.airportAdvanceMinutes, 150);
  assert.deepEqual(state.spots, []);
});

test("duplicate events merge evidence instead of creating a second event", () => {
  const fingerprint = createEventFingerprint("artist-1", "2026-08-29T18:00:00+09:00", "Summer Memory Club");
  const base = { id: "event-1", artistId: "artist-1", sourcePostIds: ["post-1"], title: "Summer Memory Club", eventType: "FAN MEETING", startsAt: "2026-08-29T18:00:00+09:00", venue: "YES24", city: "Seoul", countryCode: "KR", confirmedAt: "2026-08-01T00:00:00Z", dedupeFingerprint: fingerprint };
  const merged = mergeConfirmedEvent([base], { ...base, id: "event-2", sourcePostIds: ["post-2"] });
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].sourcePostIds, ["post-1", "post-2"]);
});

test("event fingerprints normalize punctuation but preserve artist and time", () => {
  assert.equal(normalizeEventName("Summer Memory Club!"), "summermemoryclub");
  assert.equal(
    createEventFingerprint("artist-1", "2026-08-29T18:00:00+09:00", "Summer Memory Club!"),
    createEventFingerprint("artist-1", "2026-08-29T18:00:00+09:00", "summer memory club"),
  );
  assert.notEqual(
    createEventFingerprint("artist-1", "2026-08-29T18:00:00+09:00", "Summer Memory Club"),
    createEventFingerprint("artist-2", "2026-08-29T18:00:00+09:00", "Summer Memory Club"),
  );
});

test("invalid or future local data fails safely", () => {
  assert.deepEqual(parseLocalState("not-json"), createEmptyLocalState());
  assert.deepEqual(parseLocalState('{"version":2}'), createEmptyLocalState());
});

test("missing fields are repaired during parsing", () => {
  const parsed = parseLocalState('{"version":1,"attendanceByEvent":{"event-1":"going"}}');
  assert.equal(parsed.attendanceByEvent["event-1"], "going");
  assert.deepEqual(parsed.feasibilityRuns, []);
  assert.deepEqual(parsed.decisionDrafts, {});
  assert.equal(parsed.timeAssumptions.immigrationMinutes, 120);
  assert.deepEqual(parsed.spots, []);
});

test("partial saved assumptions are repaired without losing custom values", () => {
  const parsed = parseLocalState('{"version":1,"timeAssumptions":{"homeToAirportMinutes":55,"venueArrivalLeadMinutes":{"standard":75}}}');
  assert.equal(parsed.timeAssumptions.homeToAirportMinutes, 55);
  assert.equal(parsed.timeAssumptions.airportAdvanceMinutes, 150);
  assert.equal(parsed.timeAssumptions.venueArrivalLeadMinutes.standard, 75);
  assert.equal(parsed.timeAssumptions.venueArrivalLeadMinutes.extreme, 30);
});
