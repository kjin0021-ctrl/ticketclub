import assert from "node:assert/strict";
import test from "node:test";
import { compareFlightStrategies } from "../lib/flight-strategies.ts";

const base = { source: "external-provider", sourceLabel: "test", verifiedLive: true, originAirport: "MEL", destinationAirport: "ICN" };
const candidates = [
  { ...base, id: "early", flightNumber: "KE1", departureAt: "2026-08-28T10:00:00+10:00", arrivalAt: "2026-08-28T23:00:00+09:00", stops: 0, price: { amount: "1200", currency: "AUD" } },
  { ...base, id: "cheap", flightNumber: "SQ2", departureAt: "2026-08-28T16:00:00+10:00", arrivalAt: "2026-08-29T03:00:00+09:00", stops: 1, price: { amount: "700", currency: "AUD" } },
  { ...base, id: "late", flightNumber: "QF3", departureAt: "2026-08-28T20:00:00+10:00", arrivalAt: "2026-08-29T05:00:00+09:00", stops: 0 },
];
const input = { availableFrom: "2026-08-28T05:00:00+10:00", mustReturnBy: "2026-09-02T09:00:00+10:00", eventStartsAt: "2026-08-29T18:00:00+09:00", riskMode: "standard", assumedReturnHomeAt: "2026-09-01T08:00:00+10:00" };

test("chooses distinct flight strategies only from feasible evidence", () => {
  const strategies = compareFlightStrategies(candidates, input);
  assert.equal(strategies.find((item) => item.kind === "stable").candidate.id, "early");
  assert.equal(strategies.find((item) => item.kind === "economic").candidate.id, "cheap");
  assert.equal(strategies.find((item) => item.kind === "latest").candidate.id, "late");
});

test("does not invent an economic option without a supplied price", () => {
  const strategies = compareFlightStrategies([candidates[2]], input);
  assert.equal(strategies.find((item) => item.kind === "economic").candidate, undefined);
  assert.match(strategies.find((item) => item.kind === "economic").unavailableReason, /价格/);
});
