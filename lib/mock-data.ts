import type {
  ArtistEvent,
  FeasibilitySummary,
  NearbyEvent,
} from "./types";

// MOCK DATA: replace through source adapters later. Keeping it outside UI
// components lets us tune the product flow without rewriting presentation code.
export const featuredEvent: ArtistEvent = {
  id: "event-kiiikiii-summer-memory-club",
  artist: "KiiiKiii",
  title: "Summer Memory Club",
  type: "FAN MEETING",
  city: "Seoul",
  country: "Korea",
  venue: "YES24 Live Hall",
  startsAt: "2026-08-29T18:00:00+09:00",
  checkInAt: "2026-08-29T16:30:00+09:00",
  sourceLabel: "@We_KiiiKiii",
  confidence: "official",
};

export const feasibility: FeasibilitySummary = {
  mode: "standard",
  feasible: true,
  totalTravelMinutes: 875,
  bufferMinutes: 190,
  latestDeparture: "08.28 · 22:40",
  route: ["家", "墨尔本机场", "仁川机场", "YES24 Live Hall"],
};

export const nearbyEvents: NearbyEvent[] = [
  {
    id: "nearby-inkigayo",
    title: "Inkigayo 公开录制",
    startsAt: "08.30 · 15:20",
    distanceKm: 4.2,
    fit: "on-route",
  },
  {
    id: "nearby-fansign",
    title: "Fan Signing · Hongdae",
    startsAt: "08.30 · 19:00",
    distanceKm: 2.8,
    fit: "conflict",
  },
];
