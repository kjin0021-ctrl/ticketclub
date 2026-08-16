import type { FlightCandidate } from "./flight-adapters";

const airportTimeZones: Record<string, string> = {
  MEL: "Australia/Melbourne",
  SYD: "Australia/Sydney",
  BNE: "Australia/Brisbane",
  PER: "Australia/Perth",
  ICN: "Asia/Seoul",
  GMP: "Asia/Seoul",
};

interface AmadeusSegment {
  carrierCode: string;
  number: string;
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
}

interface AmadeusOffer {
  id: string;
  itineraries: Array<{ duration?: string; segments: AmadeusSegment[] }>;
  price?: { total?: string; currency?: string };
}

function partsAsUtc(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
}

export function zonedLocalToIso(localDateTime: string, airportCode: string) {
  const timeZone = airportTimeZones[airportCode] ?? "UTC";
  const desired = new Date(`${localDateTime}Z`).getTime();
  let instant = desired;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    instant += desired - partsAsUtc(new Date(instant), timeZone);
  }
  return new Date(instant).toISOString();
}

export function mapAmadeusOffers(offers: AmadeusOffer[]): FlightCandidate[] {
  return offers.flatMap((offer) => {
    const itinerary = offer.itineraries[0];
    const segments = itinerary?.segments ?? [];
    const first = segments[0];
    const last = segments.at(-1);
    if (!first || !last) return [];
    return [{
      id: `amadeus-${offer.id}`,
      flightNumber: segments.map((segment) => `${segment.carrierCode}${segment.number}`).join(" + "),
      departureAt: zonedLocalToIso(first.departure.at, first.departure.iataCode),
      arrivalAt: zonedLocalToIso(last.arrival.at, last.arrival.iataCode),
      stops: Math.max(0, segments.length - 1),
      originAirport: first.departure.iataCode,
      destinationAirport: last.arrival.iataCode,
      source: "external-provider" as const,
      sourceLabel: "Amadeus 测试数据",
      verifiedLive: false,
      duration: itinerary.duration,
      price: offer.price?.total && offer.price.currency ? { amount: offer.price.total, currency: offer.price.currency } : undefined,
    }];
  });
}

export async function searchAmadeusFlights(input: {
  clientId: string;
  clientSecret: string;
  origin: string;
  destination: string;
  departureDate: string;
  max?: number;
  fetcher?: typeof fetch;
}) {
  const fetcher = input.fetcher ?? fetch;
  const tokenResponse = await fetcher("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: input.clientId, client_secret: input.clientSecret }),
  });
  if (!tokenResponse.ok) throw new Error(`Amadeus 授权失败（${tokenResponse.status}）`);
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) throw new Error("Amadeus 没有返回访问令牌");

  const query = new URLSearchParams({
    originLocationCode: input.origin,
    destinationLocationCode: input.destination,
    departureDate: input.departureDate,
    adults: "1",
    max: String(input.max ?? 5),
    currencyCode: "AUD",
  });
  const response = await fetcher(`https://test.api.amadeus.com/v2/shopping/flight-offers?${query}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const payload = await response.json() as { data?: AmadeusOffer[]; errors?: Array<{ detail?: string; title?: string }> };
  if (!response.ok) throw new Error(payload.errors?.[0]?.detail ?? payload.errors?.[0]?.title ?? `航班查询失败（${response.status}）`);
  return mapAmadeusOffers(payload.data ?? []);
}
