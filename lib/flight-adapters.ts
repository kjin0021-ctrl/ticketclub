import type { CandidateFlight } from "./feasibility-engine";

export type FlightInputMode = "recommended" | "flight-number" | "manual";

export interface FlightCandidate extends CandidateFlight {
  id: string;
  source: "local-estimate" | "manual" | "external-provider" | "browser-import";
  sourceLabel: string;
  verifiedLive: boolean;
  price?: { amount: string; currency: string };
  duration?: string;
  bookingUrl?: string;
}

export interface FlightLookupResult {
  status: "resolved" | "needs-schedule" | "invalid";
  normalizedFlightNumber: string;
  message: string;
  candidate?: FlightCandidate;
}

export function normalizeFlightNumber(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function isValidFlightNumber(value: string) {
  return /^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(normalizeFlightNumber(value));
}

export function createLocalEstimate(input: {
  departureDate: string;
  arrivalDate: string;
  originAirport?: string;
  destinationAirport?: string;
}): FlightCandidate {
  return {
    id: "local-estimate-mel-icn",
    flightNumber: "TC ESTIMATE",
    departureAt: `${input.departureDate}T22:40:00+10:00`,
    arrivalAt: `${input.arrivalDate}T09:15:00+09:00`,
    stops: 0,
    originAirport: input.originAirport ?? "MEL",
    destinationAirport: input.destinationAirport ?? "ICN",
    source: "local-estimate",
    sourceLabel: "本地演示估算",
    verifiedLive: false,
  };
}

export function createManualFlight(input: {
  flightNumber: string;
  departureAt: string;
  arrivalAt: string;
  stops: number;
  originAirport: string;
  destinationAirport: string;
}): FlightCandidate {
  return {
    id: `manual-${normalizeFlightNumber(input.flightNumber) || "flight"}`,
    flightNumber: normalizeFlightNumber(input.flightNumber) || "MANUAL",
    departureAt: input.departureAt,
    arrivalAt: input.arrivalAt,
    stops: Math.max(0, Math.floor(input.stops)),
    originAirport: input.originAirport.trim().toUpperCase(),
    destinationAirport: input.destinationAirport.trim().toUpperCase(),
    source: "manual",
    sourceLabel: "用户确认的航班时间",
    verifiedLive: false,
  };
}

export function resolveFlightNumberOffline(value: string): FlightLookupResult {
  const normalizedFlightNumber = normalizeFlightNumber(value);
  if (!isValidFlightNumber(normalizedFlightNumber)) {
    return { status: "invalid", normalizedFlightNumber, message: "请输入类似 KE402、QF9 的航班号。" };
  }
  return {
    status: "needs-schedule",
    normalizedFlightNumber,
    message: "航班号有效。免费离线模式无法确认具体日期的时刻，请继续确认起飞和抵达时间。",
  };
}

export interface FlightDataAdapter {
  id: string;
  label: string;
  lookup(flightNumber: string, date: string): Promise<FlightLookupResult>;
}

export const offlineFlightAdapter: FlightDataAdapter = {
  id: "offline",
  label: "免费离线适配器",
  async lookup(flightNumber) {
    return resolveFlightNumberOffline(flightNumber);
  },
};
