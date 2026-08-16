export type FieldConfidence = "high" | "medium" | "missing";

export interface ExtractedEventDraft {
  title: string;
  eventType: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  countryCode: string;
  isLikelyEvent: boolean;
  confidence: Record<"date" | "time" | "venue" | "eventType", FieldConfidence>;
}

const eventTypes = [
  ["FAN MEETING", /fan\s?meeting|팬미팅/i],
  ["FAN SIGNING", /fan\s?sign|fansign|签售|팬사인회/i],
  ["CONCERT", /concert|演唱会|콘서트/i],
  ["MUSIC SHOW", /inkigayo|music bank|m countdown|show champion|公开录制|사전녹화/i],
  ["FESTIVAL", /festival|音乐节|페스티벌/i],
] as const;

export function extractEventFromText(text: string, defaultYear = 2026): ExtractedEventDraft {
  const normalized = text.replace(/\r/g, "").trim();
  const typeMatch = eventTypes.find(([, pattern]) => pattern.test(normalized));
  const isoDate = normalized.match(/\b(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})\b/);
  const shortDate = normalized.match(/(?:\b|\s)(\d{1,2})[.\-/](\d{1,2})(?:\b|\s)/);
  const chineseDate = normalized.match(/(\d{1,2})月(\d{1,2})日/);
  const time24 = normalized.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const time12 = normalized.match(/\b(\d{1,2})(?::([0-5]\d))?\s?(AM|PM)\b/i);
  const venueMatch = normalized.match(/(?:@|at|venue[:：]?|场馆[:：]?|장소[:：]?)\s*([^\n|·]+?)(?=\s{2,}|\n|$)/i);

  let date = "";
  if (isoDate) date = `${isoDate[1]}-${isoDate[2].padStart(2, "0")}-${isoDate[3].padStart(2, "0")}`;
  else {
    const parts = shortDate ? [shortDate[1], shortDate[2]] : chineseDate ? [chineseDate[1], chineseDate[2]] : null;
    if (parts) date = `${defaultYear}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  }

  let time = "";
  if (time24) time = `${time24[1].padStart(2, "0")}:${time24[2]}`;
  else if (time12) {
    let hour = Number(time12[1]) % 12;
    if (time12[3].toUpperCase() === "PM") hour += 12;
    time = `${String(hour).padStart(2, "0")}:${time12[2] ?? "00"}`;
  }

  const city = /seoul|서울/i.test(normalized) ? "Seoul" : /busan|부산/i.test(normalized) ? "Busan" : "";
  const venue = venueMatch?.[1]?.trim().replace(/[,.]$/, "") ?? "";
  const firstLine = normalized.split("\n").find(Boolean)?.slice(0, 80) ?? "待确认活动";

  return {
    title: firstLine,
    eventType: typeMatch?.[0] ?? "OTHER OFFLINE EVENT",
    date,
    time,
    venue,
    city,
    countryCode: city ? "KR" : "",
    isLikelyEvent: Boolean(typeMatch && date),
    confidence: {
      date: date ? "high" : "missing",
      time: time ? "high" : "missing",
      venue: venue ? "medium" : "missing",
      eventType: typeMatch ? "high" : "missing",
    },
  };
}

