import { zonedLocalToIso } from "./amadeus-flight-provider.ts";
import type { FlightCandidate } from "./flight-adapters";

export interface ParsedFlightImport {
  candidate?: FlightCandidate;
  missing: string[];
  detected: { flightNumber?: string; departureTime?: string; arrivalTime?: string; price?: string };
}

export function buildFlightSearchLinks(origin: string, destination: string, date: string) {
  const route = `${origin.toUpperCase()} to ${destination.toUpperCase()} on ${date}`;
  return {
    googleFlights: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${route}`)}&curr=AUD&hl=zh-CN`,
    skyscanner: `https://www.skyscanner.com.au/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${date.replaceAll("-", "").slice(2)}/`,
  };
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function parseFlightSearchText(text: string, defaults: { origin: string; destination: string; departureDate: string }): ParsedFlightImport {
  const normalized = text.replace(/[–—]/g, "-").replace(/\r/g, "\n");
  const flightNumber = normalized.match(/\b([A-Z]{2,3}|[A-Z]\d|\d[A-Z])[\s-]?(\d{1,4}[A-Z]?)\b/i);
  const times = [...normalized.matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
  const price = normalized.match(/(?:A\$|AUD\s*|\$)\s?([\d,]+(?:\.\d{2})?)/i);
  const duration = normalized.match(/(\d{1,2})\s*(?:h|hr|小时)[\s\S]{0,8}?(\d{1,2})?\s*(?:m|min|分钟)?/i);
  const stopsMatch = normalized.match(/(\d+)\s*(?:stop|stops|次转机)/i);
  const nonstop = /nonstop|non-stop|direct|直飞/i.test(normalized);
  const detected = {
    flightNumber: flightNumber ? `${flightNumber[1]}${flightNumber[2]}`.toUpperCase() : undefined,
    departureTime: times[0],
    arrivalTime: times[1],
    price: price?.[1]?.replaceAll(",", ""),
  };
  const missing = [!detected.flightNumber && "航班号", !detected.departureTime && "起飞时间", !detected.arrivalTime && "抵达时间"].filter(Boolean) as string[];
  if (missing.length) return { detected, missing };

  const arrivalDate = detected.arrivalTime! <= detected.departureTime! ? shiftDate(defaults.departureDate, 1) : defaults.departureDate;
  return {
    detected,
    missing,
    candidate: {
      id: `browser-import-${detected.flightNumber}`,
      flightNumber: detected.flightNumber!,
      departureAt: zonedLocalToIso(`${defaults.departureDate}T${detected.departureTime}:00`, defaults.origin.toUpperCase()),
      arrivalAt: zonedLocalToIso(`${arrivalDate}T${detected.arrivalTime}:00`, defaults.destination.toUpperCase()),
      stops: nonstop ? 0 : Number(stopsMatch?.[1] ?? 0),
      originAirport: defaults.origin.toUpperCase(),
      destinationAirport: defaults.destination.toUpperCase(),
      source: "browser-import",
      sourceLabel: "用户确认的搜索结果",
      verifiedLive: false,
      duration: duration ? `PT${duration[1]}H${duration[2] ?? "0"}M` : undefined,
      price: detected.price ? { amount: detected.price, currency: "AUD" } : undefined,
    },
  };
}
