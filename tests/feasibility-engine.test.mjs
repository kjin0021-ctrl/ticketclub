import assert from "node:assert/strict";
import test from "node:test";
import { calculateFeasibility } from "../lib/feasibility-engine.ts";

const baseInput = {
  availableFrom: "2026-08-28T09:00:00Z",
  mustReturnBy: "2026-08-31T23:00:00Z",
  eventStartsAt: "2026-08-29T09:00:00Z",
  eventCheckInAt: "2026-08-29T07:30:00Z",
  riskMode: "standard",
  outboundFlight: {
    flightNumber: "TC101",
    departureAt: "2026-08-28T12:40:00Z",
    arrivalAt: "2026-08-29T00:15:00Z",
    stops: 0,
    originAirport: "MEL",
    destinationAirport: "ICN",
  },
  assumedReturnHomeAt: "2026-08-31T20:00:00Z",
};

test("returns a transparent feasible result for the standard mode", () => {
  const result = calculateFeasibility(baseInput);
  assert.equal(result.feasible, true);
  assert.equal(result.eventBufferMinutes, 105);
  assert.equal(result.timeline.length, 4);
  assert.match(result.timeline[1].detail, /机场提前 150 分钟/);
});

test("relaxed mode can reject the same flight", () => {
  const result = calculateFeasibility({ ...baseInput, riskMode: "relaxed" });
  assert.equal(result.feasible, false);
  assert.equal(result.outboundFeasible, false);
  assert.match(result.reason, /超过风险模式要求/);
});

test("return deadline participates in the final decision", () => {
  const result = calculateFeasibility({ ...baseInput, mustReturnBy: "2026-08-31T18:00:00Z" });
  assert.equal(result.feasible, false);
  assert.equal(result.returnFeasible, false);
  assert.match(result.reason, /必须返家/);
});

test("user timing assumptions override every decision segment", () => {
  const result = calculateFeasibility({
    ...baseInput,
    assumptions: {
      homeToAirportMinutes: 60,
      airportAdvanceMinutes: 180,
      immigrationMinutes: 90,
      arrivalAirportToVenueMinutes: 60,
      venueArrivalLeadMinutes: { relaxed: 420, standard: 90, extreme: 15 },
    },
  });
  assert.equal(result.assumptions.homeToAirportMinutes, 60);
  assert.equal(result.assumptions.venueArrivalLeadMinutes.standard, 90);
  assert.equal(result.eventBufferMinutes, 195);
  assert.match(result.timeline[1].detail, /机场提前 180 分钟/);
});
