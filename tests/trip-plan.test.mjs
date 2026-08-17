import assert from "node:assert/strict";
import test from "node:test";
import { buildKoreaTripPlan, createTripPlanIcs } from "../lib/trip-plan.ts";

const event = { id: "event-1", artist: "KiiiKiii", title: "Summer Memory Club", type: "FAN MEETING", city: "Seoul", country: "Korea", venue: "YES24 Live Hall", startsAt: "2026-08-29T18:00:00+09:00", sourceLabel: "X", confidence: "official" };
const flight = { flightNumber: "KE402", departureAt: "2026-08-28T12:40:00Z", arrivalAt: "2026-08-29T00:15:00Z", stops: 0, originAirport: "MEL", destinationAirport: "ICN" };
const returnFlight = { flightNumber: "KE401", departureAt: "2026-08-31T11:00:00Z", arrivalAt: "2026-09-01T00:00:00Z", stops: 0, originAirport: "ICN", destinationAirport: "MEL" };

test("builds a chronological Korea trip around the confirmed artist event", () => {
  const days = buildKoreaTripPlan({ event, flight, returnFlight, venueArrivalAt: "2026-08-29T03:45:00Z", immigrationMinutes: 120, lodging: "Hongdae guesthouse", returnHomeAt: "2026-09-01T00:35:00Z", nearbyEvents: [{ id: "nearby-1", title: "Inkigayo", startsAt: "08.30 · 15:20", distanceKm: 4.2, fit: "on-route" }], includeNearbyIds: ["nearby-1"] });
  const items = days.flatMap((day) => day.items);
  assert.equal(items[0].id, "outbound-flight");
  assert.ok(items.some((item) => item.id === "artist-event-event-1"));
  assert.ok(items.some((item) => item.id === "nearby-1"));
  assert.equal(items.find((item) => item.id === "return-flight").title, "KE401 返回");
  assert.equal(items.find((item) => item.id === "lodging-dropoff").location, "Hongdae guesthouse");
  for (const day of days) assert.deepEqual(day.items.map((item) => new Date(item.startAt).getTime()), [...day.items].map((item) => new Date(item.startAt).getTime()).sort((a, b) => a - b));
});

test("calendar export contains valid event boundaries and escaped content", () => {
  const days = buildKoreaTripPlan({ event, flight, returnFlight, venueArrivalAt: "2026-08-29T03:45:00Z", immigrationMinutes: 120, lodging: "Hotel, Seoul", returnHomeAt: "2026-09-01T00:35:00Z" });
  const ics = createTripPlanIcs(days, "KiiiKiii; Seoul");
  assert.match(ics, /^BEGIN:VCALENDAR\r\nVERSION:2.0/);
  assert.match(ics, /BEGIN:VEVENT/);
  assert.match(ics, /SUMMARY:KiiiKiii · Summer Memory Club/);
  assert.match(ics, /SUMMARY:KE401 返回/);
  assert.match(ics, /X-WR-CALNAME:KiiiKiii\\; Seoul/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});

test("verified revisit spots replace the generic personal-place placeholder", () => {
  const days = buildKoreaTripPlan({ event, flight, returnFlight, venueArrivalAt: "2026-08-29T03:45:00Z", immigrationMinutes: 120, lodging: "", returnHomeAt: "2026-09-01T00:35:00Z", personalSpots: [{ id: "spot-1", name: "My favorite cafe", address: "Hongdae 12", suitableTime: "演出结束后仍营业" }] });
  const items = days.flatMap((day) => day.items);
  assert.equal(items.some((item) => item.id === "personal-spots"), false);
  assert.equal(items.find((item) => item.id === "personal-spot-1").location, "Hongdae 12");
});
