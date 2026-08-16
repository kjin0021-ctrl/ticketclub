import assert from "node:assert/strict";
import test from "node:test";
import { buildFlightSearchLinks, parseFlightSearchText } from "../lib/flight-import.ts";

test("builds user-controlled flight search links without an API key", () => {
  const links = buildFlightSearchLinks("MEL", "ICN", "2026-08-28");
  assert.match(links.googleFlights, /google\.com\/travel\/flights/);
  assert.match(decodeURIComponent(links.googleFlights), /MEL to ICN on 2026-08-28/);
  assert.match(links.skyscanner, /mel\/icn\/260828/);
});

test("parses a copied flight result into a confirmed candidate", () => {
  const parsed = parseFlightSearchText("KE 402\nMEL 22:40 → ICN 09:15\nNonstop · 14h 35m · A$812.40", { origin: "MEL", destination: "ICN", departureDate: "2026-08-28" });
  assert.deepEqual(parsed.missing, []);
  assert.equal(parsed.candidate.flightNumber, "KE402");
  assert.equal(parsed.candidate.departureAt, "2026-08-28T12:40:00.000Z");
  assert.equal(parsed.candidate.arrivalAt, "2026-08-29T00:15:00.000Z");
  assert.deepEqual(parsed.candidate.price, { amount: "812.40", currency: "AUD" });
  assert.equal(parsed.candidate.source, "browser-import");
});

test("keeps incomplete OCR output editable instead of inventing data", () => {
  const parsed = parseFlightSearchText("MEL to Seoul, A$900", { origin: "MEL", destination: "ICN", departureDate: "2026-08-28" });
  assert.equal(parsed.candidate, undefined);
  assert.deepEqual(parsed.missing, ["航班号", "起飞时间", "抵达时间"]);
});
