import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyLocalState, createEventFingerprint, findPossibleEventUpdate, mergeConfirmedEvent, normalizeEventName, parseLocalState, removeLegacyDemoData, updateConfirmedEvent } from "../lib/local-store.ts";

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

test("a cancellation with the same event fingerprint updates status instead of being swallowed as a duplicate", () => {
  const fingerprint = createEventFingerprint("artist-1", "2026-08-29T18:00:00+09:00", "Summer Memory Club");
  const base = { id: "event-1", artistId: "artist-1", sourcePostIds: ["post-1"], title: "Summer Memory Club", eventType: "FAN MEETING", startsAt: "2026-08-29T18:00:00+09:00", venue: "YES24", city: "Seoul", countryCode: "KR", confirmedAt: "2026-08-01T00:00:00Z", dedupeFingerprint: fingerprint, status: "scheduled" };
  const merged = mergeConfirmedEvent([base], { ...base, id: "event-2", sourcePostIds: ["post-cancel"], confirmedAt: "2026-08-02T00:00:00Z", status: "cancelled" });
  assert.equal(merged[0].status, "cancelled"); assert.deepEqual(merged[0].sourcePostIds, ["post-1", "post-cancel"]);
  assert.equal(merged[0].changeHistory?.[0].changes[0].field, "status");
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

test("same artist and normalized title is offered as an update instead of silently duplicated", () => {
  const base = { id: "event-1", artistId: "artist-1", sourcePostIds: ["post-1"], title: "Summer Memory Club", eventType: "FAN MEETING", startsAt: "2026-08-29T18:00:00+09:00", venue: "YES24", city: "Seoul", countryCode: "KR", confirmedAt: "2026-08-01T00:00:00Z", dedupeFingerprint: createEventFingerprint("artist-1", "2026-08-29T18:00:00+09:00", "Summer Memory Club") };
  const candidate = { ...base, id: "event-2", startsAt: "2026-08-29T19:00:00+09:00", dedupeFingerprint: createEventFingerprint("artist-1", "2026-08-29T19:00:00+09:00", "Summer Memory Club!") };
  assert.equal(findPossibleEventUpdate([base], candidate)?.id, "event-1");
});

test("confirmed changes preserve the old values and merge source evidence", () => {
  const base = { id: "event-1", artistId: "artist-1", sourcePostIds: ["post-1"], title: "Summer Memory Club", eventType: "FAN MEETING", startsAt: "2026-08-29T18:00:00+09:00", venue: "YES24", city: "Seoul", countryCode: "KR", confirmedAt: "2026-08-01T00:00:00Z", dedupeFingerprint: "old" };
  const updated = updateConfirmedEvent(base, { ...base, id: "new-id", sourcePostIds: ["post-2"], startsAt: "2026-08-29T19:00:00+09:00", venue: "Olympic Hall", dedupeFingerprint: "new" }, "post-2", "2026-08-02T00:00:00Z");
  assert.equal(updated.id, "event-1"); assert.deepEqual(updated.sourcePostIds, ["post-1", "post-2"]);
  assert.equal(updated.changeHistory?.[0].changes.length, 2); assert.equal(updated.changeHistory?.[0].changes[0].before, "2026-08-29T18:00:00+09:00");
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

test("removes only the retired Summer Memory Club demo chain", () => {
  const state = createEmptyLocalState();
  const demoPost = { id: "demo-post", artistId: "artist-kiiikiii", url: "https://x.com/We_KiiiKiii/status/2234567890123456789", importedAt: "2026-08-01T00:00:00Z" };
  const realPost = { id: "real-post", artistId: "artist-kiiikiii", url: "https://tickets.interpark.com/contents/notice/detail/13375", importedAt: "2026-08-01T00:00:00Z" };
  const eventBase = { artistId: "artist-kiiikiii", eventType: "CONCERT", startsAt: "2026-05-16T18:00:00+09:00", venue: "Blue Square", city: "Seoul", countryCode: "KR", confirmedAt: "2026-08-01T00:00:00Z", dedupeFingerprint: "fingerprint" };
  const cleaned = removeLegacyDemoData({ ...state, importedPosts: [demoPost, realPost], confirmedImportedEvents: [
    { ...eventBase, id: "demo-event", sourcePostIds: ["demo-post"], title: "Summer Memory Club FAN MEETING" },
    { ...eventBase, id: "real-event", sourcePostIds: ["real-post"], title: "KiiiKiii FesTiiival" },
  ], attendanceByEvent: { "demo-event": "not-going", "real-event": "considering" } });
  assert.deepEqual(cleaned.importedPosts.map((post) => post.id), ["real-post"]);
  assert.deepEqual(cleaned.confirmedImportedEvents.map((event) => event.id), ["real-event"]);
  assert.deepEqual(cleaned.attendanceByEvent, { "real-event": "considering" });
});
