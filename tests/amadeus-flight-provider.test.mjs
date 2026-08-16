import assert from "node:assert/strict";
import test from "node:test";
import { mapAmadeusOffers, searchAmadeusFlights, zonedLocalToIso } from "../lib/amadeus-flight-provider.ts";

const offer = {
  id: "offer-1",
  itineraries: [{
    duration: "PT14H35M",
    segments: [{
      carrierCode: "KE",
      number: "402",
      departure: { iataCode: "MEL", at: "2026-08-28T22:40:00" },
      arrival: { iataCode: "ICN", at: "2026-08-29T09:15:00" },
    }],
  }],
  price: { total: "812.40", currency: "AUD" },
};

test("converts airport-local Amadeus times into stable instants", () => {
  assert.equal(zonedLocalToIso("2026-08-28T22:40:00", "MEL"), "2026-08-28T12:40:00.000Z");
  assert.equal(zonedLocalToIso("2026-08-29T09:15:00", "ICN"), "2026-08-29T00:15:00.000Z");
});

test("maps offers into the shared flight candidate contract", () => {
  const [candidate] = mapAmadeusOffers([offer]);
  assert.equal(candidate.flightNumber, "KE402");
  assert.equal(candidate.stops, 0);
  assert.deepEqual(candidate.price, { amount: "812.40", currency: "AUD" });
  assert.equal(candidate.sourceLabel, "Amadeus 测试数据");
  assert.equal(candidate.verifiedLive, false);
});

test("authenticates server-side and queries the official test endpoint", async () => {
  const calls = [];
  const fetcher = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return calls.length === 1
      ? new Response(JSON.stringify({ access_token: "secret-token" }), { status: 200 })
      : new Response(JSON.stringify({ data: [offer] }), { status: 200 });
  };
  const candidates = await searchAmadeusFlights({ clientId: "id", clientSecret: "secret", origin: "MEL", destination: "ICN", departureDate: "2026-08-28", fetcher });
  assert.equal(candidates.length, 1);
  assert.match(calls[0].url, /oauth2\/token/);
  assert.match(calls[1].url, /flight-offers/);
  assert.equal(calls[1].options.headers.Authorization, "Bearer secret-token");
});
