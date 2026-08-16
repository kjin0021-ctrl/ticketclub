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
}

export interface ConfirmedImportedEvent {
  id: string;
  artistId: string;
  sourcePostIds: string[];
  title: string;
  eventType: string;
  startsAt: string;
  venue: string;
  city: string;
  countryCode: string;
  confirmedAt: string;
  dedupeFingerprint: string;
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
    ? events.map((item) => item.id === duplicate.id ? { ...item, sourcePostIds: [...new Set([...(item.sourcePostIds ?? []), ...event.sourcePostIds])] } : item)
    : [event, ...events];
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

export function parseLocalState(raw: string | null): TicketClubLocalState {
  if (!raw) return createEmptyLocalState();
  try {
    const parsed = JSON.parse(raw) as Partial<TicketClubLocalState>;
    if (parsed.version !== 1) return createEmptyLocalState();
    return {
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
    };
  } catch {
    return createEmptyLocalState();
  }
}

export function loadLocalState(): TicketClubLocalState {
  if (typeof window === "undefined") return memoryFallback ?? createEmptyLocalState();
  try {
    if (!window.localStorage) return memoryFallback ?? createEmptyLocalState();
    return parseLocalState(window.localStorage.getItem(TICKETCLUB_STORAGE_KEY));
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

export function resolveImportedPost(postId: string, status: "confirmed" | "ignored", event?: ConfirmedImportedEvent) {
  return updateLocalState((state) => {
    let confirmedImportedEvents = state.confirmedImportedEvents;
    if (event) {
      confirmedImportedEvents = mergeConfirmedEvent(confirmedImportedEvents, event);
    }
    return {
      ...state,
      importedPosts: state.importedPosts.map((post) => post.id === postId ? { ...post, status } : post),
      confirmedImportedEvents,
    };
  });
}
