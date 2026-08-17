import type { AttendanceStatus } from "./types";
import { defaultTimeAssumptions, type FeasibilityResult, type RiskMode, type TimeAssumptions } from "./feasibility-engine.ts";
import type { FlightInputMode } from "./flight-adapters";

export const TICKETCLUB_STORAGE_KEY = "ticketclub.local.v1";
let memoryFallback: TicketClubLocalState | null = null;

export interface SavedAvailability {
  id: string;
  rawInput: string;
  inputMethod: "text" | "screenshot" | "manual";
  screenshotName?: string;
  originLabel: string;
  availableFrom: string;
  availableUntil: string;
  confirmedAt: string;
}

export interface SavedFeasibilityRun {
  id: string;
  eventId: string;
  availabilityId: string;
  riskMode: RiskMode;
  result: FeasibilityResult;
  createdAt: string;
}

export interface DecisionDraft {
  eventId: string;
  availabilityText: string;
  screenshotName: string;
  origin: string;
  availableFrom: string;
  mustReturnBy: string;
  riskMode: RiskMode;
  flightInputMode?: FlightInputMode;
  flightNumber?: string;
  flightDepartureAt?: string;
  flightArrivalAt?: string;
  flightStops?: number;
  originAirport?: string;
  destinationAirport?: string;
  assumedReturnHomeAt?: string;
  returnFlightNumber?: string;
  returnFlightDepartureAt?: string;
  returnFlightArrivalAt?: string;
  returnFlightStops?: number;
  returnOriginAirport?: string;
  returnDestinationAirport?: string;
  timeAssumptions?: TimeAssumptions;
  updatedAt: string;
}

export interface SavedArtist {
  id: string;
  name: string;
  xHandle: string;
  eventTypes: string[];
  notifyPossibleEvents: boolean;
  createdAt: string;
}

export interface SavedSource {
  id: string;
  artistId: string;
  kind: "x_profile" | "rsshub" | "manual" | "x_api";
  label: string;
  url: string;
  status: "ready" | "needs_action" | "experimental" | "failed";
  xBellEnabled?: boolean;
  lastCheckedAt?: string;
  latestItemCount?: number;
  createdAt: string;
}

export interface ImportedPost {
  id: string;
  artistId: string;
  url: string;
  text?: string;
  importedAt: string;
  status?: "pending" | "confirmed" | "ignored";
  origin?: "manual_x" | "manual_public" | "github_monitor";
  cloudIssueUrl?: string;
  sourceTrust?: SourceTrust;
}

export type SourceTrust = "artist_official" | "organizer_official" | "ticketing_official" | "media" | "fan";

export interface ConfirmedImportedEvent {
  id: string;
  artistId: string;
  sourcePostIds: string[];
  title: string;
  eventType: string;
  startsAt: string;
  ticketingAt?: string;
  checkInAt?: string;
  rehearsalAt?: string;
  doorsAt?: string;
  venue: string;
  city: string;
  countryCode: string;
  confirmedAt: string;
  dedupeFingerprint: string;
  extractionEvidence?: Array<{ field: string; excerpt: string }>;
  changeHistory?: EventChangeRecord[];
  status?: "scheduled" | "postponed" | "cancelled";
}

export interface EventChangeRecord {
  id: string;
  changedAt: string;
  sourcePostId: string;
  changes: Array<{ field: "startsAt" | "venue" | "city" | "eventType" | "status"; before: string; after: string }>;
}

export interface SavedSpot {
  id: string;
  name: string;
  kind: "restaurant" | "sight" | "stay" | "shop" | "other";
  status: "visited-revisit" | "wishlist";
  city: string;
  countryCode: string;
  address: string;
  tags: string[];
  suitableTime: string;
  notes: string;
  photoDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationKind = "new_event" | "changed_event" | "cancelled_event" | "source_failure";

export interface SavedNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  eventId?: string;
  sourceId?: string;
  createdAt: string;
  readAt?: string;
}

export function normalizeEventName(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "");
}

export function createEventFingerprint(artistId: string, startsAt: string, title: string) {
  return `${artistId}|${startsAt}|${normalizeEventName(title)}`;
}

export function mergeConfirmedEvent(events: ConfirmedImportedEvent[], event: ConfirmedImportedEvent) {
  const duplicate = events.find((item) => item.dedupeFingerprint === event.dedupeFingerprint);
  return duplicate
    ? events.map((item) => item.id === duplicate.id ? event.status && event.status !== (item.status ?? "scheduled")
      ? updateConfirmedEvent(item, event, event.sourcePostIds[0] ?? "unknown", event.confirmedAt)
      : { ...item, sourcePostIds: [...new Set([...(item.sourcePostIds ?? []), ...event.sourcePostIds])] } : item)
    : [event, ...events];
}

export function findPossibleEventUpdate(events: ConfirmedImportedEvent[], event: Pick<ConfirmedImportedEvent, "artistId" | "title" | "dedupeFingerprint">) {
  return events.find((item) => item.dedupeFingerprint !== event.dedupeFingerprint && item.artistId === event.artistId && normalizeEventName(item.title) === normalizeEventName(event.title));
}

export function updateConfirmedEvent(existing: ConfirmedImportedEvent, next: ConfirmedImportedEvent, sourcePostId: string, changedAt = new Date().toISOString()) {
  const comparable = ["startsAt", "venue", "city", "eventType", "status"] as const;
  const changes = comparable.flatMap((field) => existing[field] === next[field] ? [] : [{ field, before: existing[field], after: next[field] }]);
  return {
    ...existing, ...next, id: existing.id,
    sourcePostIds: [...new Set([...(existing.sourcePostIds ?? []), ...(next.sourcePostIds ?? [])])],
    changeHistory: changes.length ? [...(existing.changeHistory ?? []), { id: `${sourcePostId}-${changedAt}`, changedAt, sourcePostId, changes }] : existing.changeHistory,
  } satisfies ConfirmedImportedEvent;
}

export interface TicketClubLocalState {
  version: 1;
  attendanceByEvent: Record<string, AttendanceStatus>;
  availability: SavedAvailability[];
  feasibilityRuns: SavedFeasibilityRun[];
  decisionDrafts: Record<string, DecisionDraft>;
  artists: SavedArtist[];
  sources: SavedSource[];
  importedPosts: ImportedPost[];
  confirmedImportedEvents: ConfirmedImportedEvent[];
  timeAssumptions: TimeAssumptions;
  spots: SavedSpot[];
  notifications: SavedNotification[];
  sourceFailureCounts: Record<string, number>;
}

export function createEmptyLocalState(): TicketClubLocalState {
  return {
    version: 1,
    attendanceByEvent: {},
    availability: [],
    feasibilityRuns: [],
    decisionDrafts: {},
    artists: [{
      id: "artist-kiiikiii",
      name: "KiiiKiii",
      xHandle: "We_KiiiKiii",
      eventTypes: ["演唱会", "Fan Meeting", "签售", "公开录制"],
      notifyPossibleEvents: true,
      createdAt: "2026-08-16T00:00:00.000Z",
    }],
    sources: [{
      id: "source-kiiikiii-x",
      artistId: "artist-kiiikiii",
      kind: "x_profile",
      label: "X 官方主页",
      url: "https://x.com/We_KiiiKiii",
      status: "needs_action",
      xBellEnabled: false,
      createdAt: "2026-08-16T00:00:00.000Z",
    }],
    importedPosts: [],
    confirmedImportedEvents: [],
    timeAssumptions: defaultTimeAssumptions,
    spots: [],
    notifications: [],
    sourceFailureCounts: {},
  };
}

const legacyDemoPostUrls = new Set([
  "https://x.com/We_KiiiKiii/status/2234567890123456789",
  "https://x.com/We_KiiiKiii/status/3234567890123456789",
]);

export function removeLegacyDemoData(state: TicketClubLocalState): TicketClubLocalState {
  const demoPostIds = new Set(state.importedPosts.filter((post) => legacyDemoPostUrls.has(post.url) || /Summer Memory Club FAN MEETING/i.test(post.text ?? "")).map((post) => post.id));
  const demoEventIds = new Set(state.confirmedImportedEvents
    .filter((event) => event.title === "Summer Memory Club FAN MEETING" || event.sourcePostIds.some((id) => demoPostIds.has(id)))
    .map((event) => event.id));
  const demoRuns = state.feasibilityRuns.filter((run) => demoEventIds.has(run.eventId));
  const demoAvailabilityIds = new Set(demoRuns.map((run) => run.availabilityId));
  return {
    ...state,
    importedPosts: state.importedPosts.filter((post) => !demoPostIds.has(post.id)),
    confirmedImportedEvents: state.confirmedImportedEvents.filter((event) => !demoEventIds.has(event.id)),
    attendanceByEvent: Object.fromEntries(Object.entries(state.attendanceByEvent).filter(([eventId]) => !demoEventIds.has(eventId))),
    decisionDrafts: Object.fromEntries(Object.entries(state.decisionDrafts).filter(([eventId]) => !demoEventIds.has(eventId))),
    feasibilityRuns: state.feasibilityRuns.filter((run) => !demoEventIds.has(run.eventId)),
    availability: state.availability.filter((item) => !demoAvailabilityIds.has(item.id)),
    notifications: state.notifications.filter((item) => !item.eventId || !demoEventIds.has(item.eventId)),
  };
}

export function parseLocalState(raw: string | null): TicketClubLocalState {
  if (!raw) return createEmptyLocalState();
  try {
    const parsed = JSON.parse(raw) as Partial<TicketClubLocalState>;
    if (parsed.version !== 1) return createEmptyLocalState();
    return removeLegacyDemoData({
      version: 1,
      attendanceByEvent: parsed.attendanceByEvent ?? {},
      availability: Array.isArray(parsed.availability) ? parsed.availability : [],
      feasibilityRuns: Array.isArray(parsed.feasibilityRuns) ? parsed.feasibilityRuns : [],
      decisionDrafts: parsed.decisionDrafts ?? {},
      artists: Array.isArray(parsed.artists) ? parsed.artists.map((artist) => artist.xHandle === "KiiiKiii_STARSHIP" ? { ...artist, xHandle: "We_KiiiKiii" } : artist) : createEmptyLocalState().artists,
      sources: Array.isArray(parsed.sources) ? parsed.sources.map((source) => source.url === "https://x.com/KiiiKiii_STARSHIP" ? { ...source, url: "https://x.com/We_KiiiKiii" } : source) : createEmptyLocalState().sources,
      importedPosts: Array.isArray(parsed.importedPosts) ? parsed.importedPosts : [],
      confirmedImportedEvents: Array.isArray(parsed.confirmedImportedEvents) ? parsed.confirmedImportedEvents.map((event) => {
        const legacyEvent = event as ConfirmedImportedEvent & { sourcePostId?: string };
        const sourcePostIds = legacyEvent.sourcePostIds ?? (legacyEvent.sourcePostId ? [legacyEvent.sourcePostId] : []);
        return { ...event, sourcePostIds, dedupeFingerprint: event.dedupeFingerprint ?? createEventFingerprint(event.artistId, event.startsAt, event.title) };
      }) : [],
      timeAssumptions: {
        ...defaultTimeAssumptions,
        ...(parsed.timeAssumptions ?? {}),
        venueArrivalLeadMinutes: {
          ...defaultTimeAssumptions.venueArrivalLeadMinutes,
          ...(parsed.timeAssumptions?.venueArrivalLeadMinutes ?? {}),
        },
      },
      spots: Array.isArray(parsed.spots) ? parsed.spots : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      sourceFailureCounts: parsed.sourceFailureCounts ?? {},
    });
  } catch {
    return createEmptyLocalState();
  }
}

export function loadLocalState(): TicketClubLocalState {
  if (typeof window === "undefined") return memoryFallback ?? createEmptyLocalState();
  try {
    if (!window.localStorage) return memoryFallback ?? createEmptyLocalState();
    const raw = window.localStorage.getItem(TICKETCLUB_STORAGE_KEY);
    const parsed = parseLocalState(raw);
    const serialized = JSON.stringify(parsed);
    if (raw !== serialized) window.localStorage.setItem(TICKETCLUB_STORAGE_KEY, serialized);
    return parsed;
  } catch {
    return memoryFallback ?? createEmptyLocalState();
  }
}

export function saveLocalState(state: TicketClubLocalState) {
  memoryFallback = state;
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(TICKETCLUB_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Privacy modes and sandboxed previews may disable localStorage. The
    // in-memory fallback keeps the current session usable without hiding it.
  }
  window.dispatchEvent(new CustomEvent("ticketclub:storage", { detail: state }));
}

export function updateLocalState(updater: (state: TicketClubLocalState) => TicketClubLocalState) {
  const next = updater(loadLocalState());
  saveLocalState(next);
  return next;
}

export function saveAttendance(eventId: string, status: AttendanceStatus) {
  return updateLocalState((state) => ({
    ...state,
    attendanceByEvent: { ...state.attendanceByEvent, [eventId]: status },
  }));
}

export function saveDecisionDraft(draft: DecisionDraft) {
  return updateLocalState((state) => ({
    ...state,
    decisionDrafts: { ...state.decisionDrafts, [draft.eventId]: draft },
  }));
}

export function saveAvailability(record: SavedAvailability) {
  return updateLocalState((state) => ({
    ...state,
    availability: [record, ...state.availability.filter((item) => item.id !== record.id)].slice(0, 50),
  }));
}

export function saveFeasibilityRun(run: SavedFeasibilityRun) {
  return updateLocalState((state) => ({
    ...state,
    feasibilityRuns: [run, ...state.feasibilityRuns].slice(0, 100),
  }));
}

export function saveTimeAssumptions(assumptions: TimeAssumptions) {
  return updateLocalState((state) => ({ ...state, timeAssumptions: assumptions }));
}

export function saveSpot(spot: SavedSpot) {
  return updateLocalState((state) => ({ ...state, spots: [spot, ...state.spots.filter((item) => item.id !== spot.id)].slice(0, 200) }));
}

export function deleteSpot(spotId: string) {
  return updateLocalState((state) => ({ ...state, spots: state.spots.filter((item) => item.id !== spotId) }));
}

export function replaceSpots(spots: SavedSpot[]) {
  return updateLocalState((state) => ({ ...state, spots: spots.slice(0, 200) }));
}

export function saveNotification(notification: SavedNotification) {
  return updateLocalState((state) => ({
    ...state,
    notifications: [notification, ...state.notifications.filter((item) => item.id !== notification.id)].slice(0, 200),
  }));
}

export function markNotificationRead(notificationId: string) {
  return updateLocalState((state) => ({
    ...state,
    notifications: state.notifications.map((item) => item.id === notificationId ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item),
  }));
}

export function markAllNotificationsRead() {
  const readAt = new Date().toISOString();
  return updateLocalState((state) => ({ ...state, notifications: state.notifications.map((item) => ({ ...item, readAt: item.readAt ?? readAt })) }));
}

export function saveArtist(artist: SavedArtist, source: SavedSource) {
  return updateLocalState((state) => ({
    ...state,
    artists: [artist, ...state.artists.filter((item) => item.id !== artist.id)],
    sources: [source, ...state.sources.filter((item) => item.id !== source.id)],
  }));
}

export function saveSource(source: SavedSource) {
  return updateLocalState((state) => ({
    ...state,
    sources: [source, ...state.sources.filter((item) => item.id !== source.id)],
  }));
}

export function saveImportedPost(post: ImportedPost) {
  return updateLocalState((state) => ({
    ...state,
    importedPosts: [post, ...state.importedPosts.filter((item) => item.url !== post.url)].slice(0, 200),
  }));
}

export function resolveImportedPost(postId: string, status: "confirmed" | "ignored", event?: ConfirmedImportedEvent, updateEventId?: string) {
  return updateLocalState((state) => {
    let confirmedImportedEvents = state.confirmedImportedEvents;
    let notifications = state.notifications;
    if (event) {
      const existing = updateEventId ? confirmedImportedEvents.find((item) => item.id === updateEventId) : undefined;
      if (existing) {
        const updated = updateConfirmedEvent(existing, event, postId);
        const latestChange = updated.changeHistory?.at(-1);
        confirmedImportedEvents = confirmedImportedEvents.map((item) => item.id === existing.id ? updated : item);
        if (latestChange?.sourcePostId === postId) notifications = [{ id: `event-change-${postId}`, kind: "changed_event", title: `${updated.title} 有变更`, body: latestChange.changes.map((change) => `${change.field}: ${change.before} → ${change.after}`).join("；"), eventId: updated.id, createdAt: latestChange.changedAt }, ...notifications];
      } else confirmedImportedEvents = mergeConfirmedEvent(confirmedImportedEvents, event);
    }
    return {
      ...state,
      importedPosts: state.importedPosts.map((post) => post.id === postId ? { ...post, status } : post),
      confirmedImportedEvents,
      notifications,
    };
  });
}

export function resolveImportedPostBatch(postId: string, events: ConfirmedImportedEvent[], updateEventIds: Array<string | undefined> = []) {
  return updateLocalState((state) => {
    let confirmedImportedEvents = state.confirmedImportedEvents;
    let notifications = state.notifications;
    events.forEach((event, index) => {
      const updateId = updateEventIds[index];
      const existing = updateId ? confirmedImportedEvents.find((item) => item.id === updateId) : undefined;
      if (existing) {
        const updated = updateConfirmedEvent(existing, event, postId);
        const latestChange = updated.changeHistory?.at(-1);
        confirmedImportedEvents = confirmedImportedEvents.map((item) => item.id === existing.id ? updated : item);
        if (latestChange?.sourcePostId === postId) notifications = [{ id: `event-change-${postId}-${index}`, kind: "changed_event", title: `${updated.title} 有变更`, body: latestChange.changes.map((change) => `${change.field}: ${change.before} → ${change.after}`).join("；"), eventId: updated.id, createdAt: latestChange.changedAt }, ...notifications];
      } else confirmedImportedEvents = mergeConfirmedEvent(confirmedImportedEvents, event);
    });
    return { ...state, importedPosts: state.importedPosts.map((post) => post.id === postId ? { ...post, status: "confirmed" as const } : post), confirmedImportedEvents, notifications };
  });
}
