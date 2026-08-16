import type { CandidateFlight } from "./feasibility-engine";
import type { ArtistEvent, NearbyEvent } from "./types";

export type TripPlanKind = "flight" | "transfer" | "stay" | "event" | "nearby" | "personal" | "return";

export interface TripPlanItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  note: string;
  kind: TripPlanKind;
  optional?: boolean;
}

export interface TripPlanDay {
  date: string;
  label: string;
  items: TripPlanItem[];
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function seoulDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(iso));
}

function nearbyIso(event: NearbyEvent, year: string) {
  const match = event.startsAt.match(/(\d{2})\.(\d{2}).*?(\d{2}):(\d{2})/);
  return match ? `${year}-${match[1]}-${match[2]}T${match[3]}:${match[4]}:00+09:00` : null;
}

export function buildKoreaTripPlan(input: {
  event: ArtistEvent;
  flight: CandidateFlight;
  venueArrivalAt: string;
  immigrationMinutes: number;
  lodging: string;
  assumedReturnHomeAt: string;
  nearbyEvents?: NearbyEvent[];
  includeNearbyIds?: string[];
  personalSpots?: Array<{ id: string; name: string; address: string; suitableTime?: string }>;
}): TripPlanDay[] {
  const eventYear = seoulDate(input.event.startsAt).slice(0, 4);
  const items: TripPlanItem[] = [
    {
      id: "outbound-flight",
      title: `${input.flight.flightNumber} 前往韩国`,
      startAt: input.flight.departureAt,
      endAt: input.flight.arrivalAt,
      location: `${input.flight.originAirport} → ${input.flight.destinationAirport}`,
      note: input.flight.stops ? `${input.flight.stops} 次转机；请以航司通知为准` : "直飞；请以航司通知为准",
      kind: "flight",
    },
    {
      id: "arrival-process",
      title: "入境、取行李与前往市区",
      startAt: input.flight.arrivalAt,
      endAt: addMinutes(input.flight.arrivalAt, input.immigrationMinutes),
      location: input.flight.destinationAirport,
      note: `当前为入境与取行李预留 ${input.immigrationMinutes} 分钟`,
      kind: "transfer",
    },
    {
      id: "lodging-dropoff",
      title: input.lodging ? "住宿寄存行李" : "确认住宿与寄存行李",
      startAt: addMinutes(input.flight.arrivalAt, input.immigrationMinutes),
      endAt: addMinutes(input.flight.arrivalAt, input.immigrationMinutes + 60),
      location: input.lodging || "尚未填写住宿地址",
      note: input.lodging ? "地址由你确认，可稍后替换" : "填写住宿后更新路线",
      kind: "stay",
    },
    {
      id: "venue-arrival",
      title: "抵达场馆周边",
      startAt: input.venueArrivalAt,
      endAt: addMinutes(input.venueArrivalAt, 30),
      location: input.event.venue,
      note: "用于兑换、签到、排队与临时变化缓冲",
      kind: "transfer",
    },
    {
      id: `artist-event-${input.event.id}`,
      title: `${input.event.artist} · ${input.event.title}`,
      startAt: input.event.startsAt,
      endAt: addMinutes(input.event.startsAt, 180),
      location: input.event.venue,
      note: `${input.event.type}；结束时间为暂估，请以官方通知为准`,
      kind: "event",
    },
  ];

  for (const nearby of input.nearbyEvents ?? []) {
    const startsAt = nearbyIso(nearby, eventYear);
    if (!startsAt || !input.includeNearbyIds?.includes(nearby.id)) continue;
    items.push({
      id: nearby.id,
      title: nearby.title,
      startAt: startsAt,
      endAt: addMinutes(startsAt, 120),
      location: `${input.event.city} · 距主行程约 ${nearby.distanceKm} km`,
      note: nearby.fit === "on-route" ? "旅行期限内，可顺路安排" : "与现有安排可能冲突，请再次核对",
      kind: "nearby",
      optional: true,
    });
  }

  const personalDate = addMinutes(input.event.startsAt, 24 * 60);
  const personalStart = new Date(`${seoulDate(personalDate)}T11:00:00+09:00`).toISOString();
  const preferredSpots = (input.personalSpots ?? []).slice(0, 2);
  if (preferredSpots.length) {
    preferredSpots.forEach((spot, index) => items.push({ id: `personal-${spot.id}`, title: spot.name, startAt: addMinutes(personalStart, index * 120), endAt: addMinutes(personalStart, index * 120 + 90), location: spot.address, note: spot.suitableTime ? `个人验证地点 · ${spot.suitableTime}` : "来自活点地图：去过且想再去", kind: "personal" }));
  } else {
    items.push({ id: "personal-spots", title: "为个人收藏地点留出的时间", startAt: personalStart, endAt: addMinutes(personalStart, 240), location: input.event.city, note: "从“活点地图”优先放入去过且想再去的地点", kind: "personal" });
  }
  items.push({
    id: "return-home",
    title: "预计返程到家",
    startAt: input.assumedReturnHomeAt,
    endAt: addMinutes(input.assumedReturnHomeAt, 30),
    location: "Home",
    note: "返程航班尚未确认时，此时间仅作为返家约束",
    kind: "return",
  });

  const groups = new Map<string, TripPlanItem[]>();
  for (const item of items.sort((a, b) => a.startAt.localeCompare(b.startAt))) {
    const date = seoulDate(item.startAt);
    groups.set(date, [...(groups.get(date) ?? []), item]);
  }
  return [...groups.entries()].map(([date, dayItems], index) => ({ date, label: `DAY ${index + 1}`, items: dayItems }));
}

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function createTripPlanIcs(days: TripPlanDay[], calendarName = "TicketClub 票来") {
  const events = days.flatMap((day) => day.items).map((item) => [
    "BEGIN:VEVENT",
    `UID:${item.id}@ticketclub.local`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(item.startAt)}`,
    `DTEND:${icsDate(item.endAt)}`,
    `SUMMARY:${escapeIcs(item.title)}`,
    `LOCATION:${escapeIcs(item.location)}`,
    `DESCRIPTION:${escapeIcs(item.note)}`,
    "END:VEVENT",
  ].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TicketClub//Trip Plan//ZH", `X-WR-CALNAME:${escapeIcs(calendarName)}`, ...events, "END:VCALENDAR", ""].join("\r\n");
}
