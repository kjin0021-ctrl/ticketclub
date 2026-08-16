export type AttendanceStatus = "going" | "considering" | "not-going";

export type EventConfidence = "official" | "possible";

export interface ArtistEvent {
  id: string;
  artist: string;
  title: string;
  type: string;
  city: string;
  country: string;
  venue: string;
  startsAt: string;
  checkInAt?: string;
  sourceLabel: string;
  confidence: EventConfidence;
}

export interface FeasibilitySummary {
  mode: "relaxed" | "standard" | "extreme";
  feasible: boolean;
  totalTravelMinutes: number;
  bufferMinutes: number;
  latestDeparture: string;
  route: string[];
}

export interface NearbyEvent {
  id: string;
  title: string;
  startsAt: string;
  distanceKm: number;
  fit: "on-route" | "conflict";
}

