import type { ConfirmedImportedEvent, SavedArtist } from "./local-store";
import type { ArtistEvent } from "./types";

export function confirmedEventToArtistEvent(
  event: ConfirmedImportedEvent,
  artist?: SavedArtist,
): ArtistEvent {
  return {
    id: event.id,
    artist: artist?.name ?? "未知艺人",
    title: event.title,
    type: event.eventType,
    city: event.city,
    country: event.countryCode === "KR" ? "Korea" : event.countryCode,
    venue: event.venue,
    startsAt: event.startsAt,
    checkInAt: event.rehearsalAt ?? event.checkInAt,
    sourceLabel: `${event.sourcePostIds.length || 1} 条公开来源`,
    confidence: "official",
  };
}
