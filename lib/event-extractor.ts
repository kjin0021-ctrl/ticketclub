export type FieldConfidence = "high" | "medium" | "missing";
export type EventTimeKind = "ticketing" | "checkIn" | "rehearsal" | "doors" | "start";
export type EventNoticeKind = "new_event" | "rescheduled" | "postponed" | "cancelled";

export interface ExtractedKeyTime { time: string; evidence: string; confidence: FieldConfidence; }
export interface ExtractionEvidence { field: "date" | "venue" | "city" | "eventType" | EventTimeKind; excerpt: string; }
export interface ExtractedEventDraft {
  title: string; eventType: string; date: string; time: string;
  keyTimes: Record<EventTimeKind, ExtractedKeyTime>;
  venue: string; city: string; countryCode: string; isLikelyEvent: boolean;
  confidence: Record<"date" | "time" | "venue" | "eventType", FieldConfidence>;
  evidence: ExtractionEvidence[];
  noticeKind: EventNoticeKind;
  noticeEvidence: string;
}

const eventTypes = [
  ["FAN MEETING", /fan\s?meeting|fanmeet|见面会|粉丝见面会|팬미팅|ファンミーティング/i],
  ["FAN SIGNING", /fan\s?sign|fansign|签售|签名会|팬사인회|サイン会/i],
  ["CONCERT", /concert|演唱会|演唱會|콘서트|コンサート|ライブ公演/i],
  ["MUSIC SHOW", /inkigayo|music bank|m countdown|show champion|公开录制|公開収録|사전녹화|음악방송/i],
  ["FESTIVAL", /festival|音乐节|音樂節|페스티벌|フェス(?:ティバル)?/i],
  ["SHOWCASE", /showcase|出道秀|回归秀|쇼케이스|ショーケース/i],
  ["AWARD SHOW", /award(?:s| show)?|颁奖礼|頒獎禮|시상식|授賞式/i],
] as const;

const timeLabels: Array<[EventTimeKind, RegExp]> = [
  ["ticketing", /ticket(?:ing| sales?| open)?|reservation|presale|开票|售票|购票|預售|예매|티켓\s?오픈|チケット|先行受付/i],
  ["checkIn", /check[ -]?in|registration|集合|签到|報到|입장\s?확인|체크인|집합|受付|集合時間/i],
  ["rehearsal", /rehearsal|sound\s?check|彩排|试音|리허설|사운드체크|リハーサル|サウンドチェック/i],
  ["doors", /doors?|admission|open(?:ing)?|入场|入場|开场|開場|입장|オープン/i],
  ["start", /show(?:time)?|start|performance|正式开始|演出开始|开始|開演|공연\s?시작|시작|本番/i],
];

const cityMap: Array<[string, string, string]> = [
  ["Seoul", "KR", "seoul|서울|首尔|首爾|ソウル|블루스퀘어|blue square|yes24 live hall"], ["Busan", "KR", "busan|부산|釜山"],
  ["Incheon", "KR", "incheon|인천|仁川"], ["Daegu", "KR", "daegu|대구|大邱"],
  ["Tokyo", "JP", "tokyo|東京|东京"], ["Osaka", "JP", "osaka|大阪"],
  ["Shanghai", "CN", "shanghai|上海"], ["Beijing", "CN", "beijing|北京"],
  ["Hong Kong", "HK", "hong kong|香港"], ["Taipei", "TW", "taipei|台北"],
  ["Bangkok", "TH", "bangkok|กรุงเทพ|曼谷"], ["Singapore", "SG", "singapore|新加坡"],
];

const emptyKeyTime = (): ExtractedKeyTime => ({ time: "", evidence: "", confidence: "missing" });

function normalizeTime(hourText: string, minuteText = "00", meridiem = "") {
  let hour = Number(hourText); const marker = meridiem.toUpperCase();
  if (/PM|오후|午後/.test(marker) && hour < 12) hour += 12;
  if (/AM|오전|午前/.test(marker) && hour === 12) hour = 0;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return "";
  return `${String(hour).padStart(2, "0")}:${minuteText.padStart(2, "0")}`;
}

function findTime(value: string) {
  const before = value.match(/\b(AM|PM)\s*(\d{1,2})(?::([0-5]\d))?\b/i);
  if (before) return normalizeTime(before[2], before[3] ?? "00", before[1]);
  const localized = value.match(/(오전|오후|午前|午後)\s*(\d{1,2})(?::([0-5]\d))?/i);
  if (localized) return normalizeTime(localized[2], localized[3] ?? "00", localized[1]);
  const meridiemAfter = value.match(/\b(\d{1,2})(?::([0-5]\d))?\s*(AM|PM)\b/i);
  if (meridiemAfter) return normalizeTime(meridiemAfter[1], meridiemAfter[2] ?? "00", meridiemAfter[3]);
  const after = value.match(/\b(\d{1,2})(?::([0-5]\d))\s*(AM|PM)?\b/i);
  if (after) return normalizeTime(after[1], after[2], after[3] ?? "");
  const cjk = value.match(/(?:^|\D)([01]?\d|2[0-3])\s*(?:时|時|시)\s*([0-5]?\d)?\s*(?:分|분)?/);
  return cjk ? normalizeTime(cjk[1], cjk[2] ?? "00") : "";
}

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function formatDate(yearText: string, monthText: string, dayText: string) {
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  return validDate(year, month, day) ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
}
function findDate(text: string, defaultYear: number) {
  const numeric = text.match(/\b(20\d{2})\s*(?:[.\-/]|年|년)\s*(\d{1,2})\s*(?:[.\-/]|月|월)\s*(\d{1,2})(?:日|일)?\b/);
  if (numeric) return { value: formatDate(numeric[1], numeric[2], numeric[3]), excerpt: numeric[0] };
  const cjk = text.match(/(?:^|\D)(\d{1,2})\s*(?:月|월)\s*(\d{1,2})(?:日|일)?/);
  if (cjk) return { value: formatDate(String(defaultYear), cjk[1], cjk[2]), excerpt: cjk[0].trim() };
  const short = text.match(/(?:^|\s)(\d{1,2})[.\-/](\d{1,2})(?=\s|\D|$)/);
  if (short) return { value: formatDate(String(defaultYear), short[1], short[2]), excerpt: short[0].trim() };
  const months = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
  const english = text.match(new RegExp(`\\b(${months})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?`, "i"));
  if (english) { const month = new Date(`${english[1]} 1, 2000`).getMonth() + 1; return { value: formatDate(english[3] ?? String(defaultYear), String(month), english[2]), excerpt: english[0] }; }
  return { value: "", excerpt: "" };
}
function cleanVenue(value: string) { return value.replace(/^[\s:：@|·-]+/, "").replace(/[\s,，.。|·-]+$/, "").trim().slice(0, 140); }

export function extractEventFromText(text: string, defaultYear = new Date().getFullYear()): ExtractedEventDraft {
  const normalized = text.normalize("NFKC").replace(/\r/g, "").trim();
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const typeMatch = eventTypes.find(([, pattern]) => pattern.test(normalized));
  const dateResult = findDate(normalized, defaultYear);
  const keyTimes: Record<EventTimeKind, ExtractedKeyTime> = { ticketing: emptyKeyTime(), checkIn: emptyKeyTime(), rehearsal: emptyKeyTime(), doors: emptyKeyTime(), start: emptyKeyTime() };
  const evidence: ExtractionEvidence[] = [];
  const noticePatterns: Array<[EventNoticeKind, RegExp]> = [["cancelled", /cancel(?:led|lation)?|取消|中止|취소|中止のお知らせ/i], ["postponed", /postpone(?:d|ment)?|延期|연기/i], ["rescheduled", /reschedule(?:d)?|改期|日程变更|日程變更|일정\s?변경|日時変更/i]];
  const noticeMatch = noticePatterns.find(([, pattern]) => pattern.test(normalized));
  const noticeKind = noticeMatch?.[0] ?? "new_event";
  const noticeEvidence = noticeMatch ? lines.find((line) => noticeMatch[1].test(line)) ?? "" : "";
  for (const line of lines) {
    const lineTime = findTime(line); if (!lineTime) continue;
    const labelled = timeLabels.find(([, pattern]) => pattern.test(line));
    if (labelled && !keyTimes[labelled[0]].time) keyTimes[labelled[0]] = { time: lineTime, evidence: line, confidence: "high" };
  }
  if (!keyTimes.start.time) {
    const dateLine = lines.find((line) => findDate(line, defaultYear).value && findTime(line));
    const fallbackLine = dateLine ?? (lines.length === 1 ? lines[0] : ""); const fallbackTime = fallbackLine ? findTime(fallbackLine) : "";
    if (fallbackTime) keyTimes.start = { time: fallbackTime, evidence: fallbackLine, confidence: "medium" };
  }
  let venue = "", venueEvidence = "";
  const venueLine = lines.find((line) => /(?:venue|location|place|场馆|地点|地址|장소|공연장|会場|会場名)\s*[:：@]/i.test(line));
  if (venueLine) { venue = cleanVenue(venueLine.replace(/^.*?(?:venue|location|place|场馆|地点|地址|장소|공연장|会場|会場名)\s*[:：@]\s*/i, "")); venueEvidence = venueLine; }
  else { const atLine = lines.find((line) => /(?:^|\s)@\s*[^@]+$|\bat\s+[A-Z\p{L}]/iu.test(line)); if (atLine) { venue = cleanVenue(atLine.replace(/^.*?(?:@|\bat\s+)/iu, "")); venueEvidence = atLine; } }
  const cityHit = cityMap.find(([, , names]) => new RegExp(`(?:^|[^\\p{L}])(?:${names})(?:$|[^\\p{L}])`, "iu").test(normalized));
  const city = cityHit?.[0] ?? "", countryCode = cityHit?.[1] ?? "";
  const titleLine = lines.find((line) => !findDate(line, defaultYear).value && !/^\s*(?:venue|location|place|场馆|地点|地址|장소|공연장|会場)\s*[:：]/i.test(line));
  const title = (titleLine ?? lines[0] ?? "待确认活动").slice(0, 120);
  if (dateResult.value) evidence.push({ field: "date", excerpt: dateResult.excerpt });
  if (typeMatch) evidence.push({ field: "eventType", excerpt: lines.find((line) => typeMatch[1].test(line)) ?? typeMatch[0] });
  if (venueEvidence) evidence.push({ field: "venue", excerpt: venueEvidence });
  if (cityHit) evidence.push({ field: "city", excerpt: lines.find((line) => new RegExp(cityHit[2], "iu").test(line)) ?? city });
  for (const [kind, value] of Object.entries(keyTimes) as Array<[EventTimeKind, ExtractedKeyTime]>) if (value.evidence) evidence.push({ field: kind, excerpt: value.evidence });
  return { title, eventType: typeMatch?.[0] ?? "OTHER OFFLINE EVENT", date: dateResult.value, time: keyTimes.start.time, keyTimes, venue, city, countryCode, isLikelyEvent: Boolean(typeMatch && (dateResult.value || noticeKind !== "new_event")), confidence: { date: dateResult.value ? "high" : "missing", time: keyTimes.start.confidence, venue: venue ? "medium" : "missing", eventType: typeMatch ? "high" : "missing" }, evidence, noticeKind, noticeEvidence };
}

/** Split line-based tour announcements into independently confirmable events. */
export function extractEventsFromText(text: string, defaultYear = new Date().getFullYear()) {
  const normalized = text.normalize("NFKC").replace(/\r/g, "").trim();
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const datedIndexes = lines.flatMap((line, index) => findDate(line, defaultYear).value ? [index] : []);
  if (datedIndexes.length < 2) return [extractEventFromText(normalized, defaultYear)];

  const sharedHeader = lines.slice(0, datedIndexes[0]);
  const venueLabelPattern = /(?:venue|location|place|场馆|地点|地址|장소|공연장|공연\s?장소|会場|会場名)\s*[:：]?/i;
  const venueIndexes = lines.flatMap((line, index) => venueLabelPattern.test(line) ? [index] : []);
  const sharedVenueLines = venueIndexes.length === 1 && venueIndexes[0] > datedIndexes.at(-1)! ? [lines[venueIndexes[0]]] : [];
  const drafts = datedIndexes.map((start, index) => {
    const end = datedIndexes[index + 1] ?? lines.length;
    return extractEventFromText([...sharedHeader, ...lines.slice(start, end), ...sharedVenueLines].join("\n"), defaultYear);
  });
  const uniqueDates = new Set(drafts.map((draft) => draft.date).filter(Boolean));
  return uniqueDates.size > 1 ? drafts : [extractEventFromText(normalized, defaultYear)];
}
