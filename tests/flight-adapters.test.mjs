import assert from "node:assert/strict";
import test from "node:test";
import { createLocalEstimate, createManualFlight, isValidFlightNumber, normalizeFlightNumber, resolveFlightNumberOffline } from "../lib/flight-adapters.ts";

test("normalizes common flight number input", () => {
  assert.equal(normalizeFlightNumber(" ke-402 "), "KE402");
  assert.equal(isValidFlightNumber("QF 9"), true);
  assert.equal(isValidFlightNumber("not a flight"), false);
});

test("offline lookup is honest about missing dated schedules", () => {
  const result = resolveFlightNumberOffline("KE402");
  assert.equal(result.status, "needs-schedule");
  assert.match(result.message, /确认起飞和抵达时间/);
  assert.equal(result.candidate, undefined);
});

test("local estimates and manual flights share the feasibility shape", () => {
  const estimate = createLocalEstimate({ departureDate: "2026-08-28", arrivalDate: "2026-08-29" });
  const manual = createManualFlight({ flightNumber: " qf-9 ", departureAt: "2026-08-28T20:00:00+10:00", arrivalAt: "2026-08-29T08:00:00+09:00", stops: 1, originAirport: "mel", destinationAirport: "icn" });
  assert.equal(estimate.verifiedLive, false);
  assert.equal(manual.flightNumber, "QF9");
  assert.equal(manual.stops, 1);
  assert.equal(manual.originAirport, "MEL");
});
