import assert from "node:assert/strict";
import test from "node:test";
import { extractEventFromText, extractEventsFromText } from "../lib/event-extractor.ts";

test("extracts a Korean fan meeting announcement without paid AI", () => {
  const result = extractEventFromText("Summer Memory Club FAN MEETING\n2026.08.29 18:00\nVenue: YES24 Live Hall, Seoul");
  assert.equal(result.eventType, "FAN MEETING");
  assert.equal(result.date, "2026-08-29");
  assert.equal(result.time, "18:00");
  assert.equal(result.venue, "YES24 Live Hall, Seoul");
  assert.equal(result.city, "Seoul");
  assert.equal(result.isLikelyEvent, true);
});

test("missing details remain visibly unconfirmed", () => {
  const result = extractEventFromText("New photos are out now");
  assert.equal(result.isLikelyEvent, false);
  assert.equal(result.confidence.date, "missing");
  assert.equal(result.confidence.venue, "missing");
});

test("extracts Korean labelled schedule times and keeps source evidence", () => {
  const result = extractEventFromText("KiiiKiii 1st FAN MEETING\n2026년 8월 29일\n장소: YES24 Live Hall, 서울\n예매 오픈 오후 8:00\n체크인 15:30\n사운드체크 16:30\n입장 17:00\n공연 시작 18:00");
  assert.equal(result.date, "2026-08-29"); assert.equal(result.city, "Seoul");
  assert.equal(result.keyTimes.ticketing.time, "20:00"); assert.equal(result.keyTimes.checkIn.time, "15:30");
  assert.equal(result.keyTimes.rehearsal.time, "16:30"); assert.equal(result.keyTimes.doors.time, "17:00");
  assert.equal(result.keyTimes.start.time, "18:00"); assert.match(result.keyTimes.rehearsal.evidence, /사운드체크/);
});

test("extracts Japanese and English dates without mistaking ticketing for showtime", () => {
  const japanese = extractEventFromText("東京 FAN MEETING\n2026年9月4日\n会場: Zepp Haneda\nチケット先行受付 12:00\n開場 17:00\n開演 18:00");
  assert.equal(japanese.date, "2026-09-04"); assert.equal(japanese.city, "Tokyo");
  assert.equal(japanese.keyTimes.ticketing.time, "12:00"); assert.equal(japanese.time, "18:00");
  const english = extractEventFromText("World Tour CONCERT\nAugust 29, 2026\nVenue: YES24 Live Hall, Seoul\nDoors 5:00 PM\nShowtime 6:00 PM");
  assert.equal(english.date, "2026-08-29"); assert.equal(english.keyTimes.doors.time, "17:00"); assert.equal(english.time, "18:00");
});

test("rejects impossible calendar dates", () => {
  const result = extractEventFromText("FAN MEETING 2026.02.31 18:00");
  assert.equal(result.date, ""); assert.equal(result.isLikelyEvent, false);
});

test("splits a multilingual tour announcement into dated city events", () => {
  const results = extractEventsFromText("KiiiKiii ASIA FAN MEETING TOUR\n2026.09.04 18:00\nVenue: Zepp Haneda, Tokyo\n2026.09.06 17:00\nVenue: YES24 Live Hall, Seoul\n2026.09.08 19:00\nVenue: Dream Hall, Busan");
  assert.equal(results.length, 3);
  assert.deepEqual(results.map((item) => item.date), ["2026-09-04", "2026-09-06", "2026-09-08"]);
  assert.deepEqual(results.map((item) => item.city), ["Tokyo", "Seoul", "Busan"]);
  assert.equal(results.every((item) => item.title.includes("KiiiKiii")), true);
});

test("reads compact KST ticket times such as 6PM", () => {
  const results = extractEventsFromText("2026 KiiiKiii FAN CONCERT\n2026년 5월 16일 공연 시작 6PM (KST)\n장소: BLUE SQUARE WOORI WON BANKING HALL, 서울\n2026년 5월 17일 공연 시작 5PM (KST)\n장소: BLUE SQUARE WOORI WON BANKING HALL, 서울");
  assert.deepEqual(results.map((item) => item.time), ["18:00", "17:00"]);
});

test("does not split repeated mentions of the same date", () => {
  const results = extractEventsFromText("CONCERT\n2026.09.04 18:00\nTicketing: 2026.09.04 12:00\nVenue: Tokyo Dome, Tokyo");
  assert.equal(results.length, 1);
});

test("detects cancellation, postponement and rescheduling notices", () => {
  const cancelled = extractEventFromText("KiiiKiii FAN MEETING\n2026.09.04 18:00\nVenue: Seoul Hall, Seoul\n공연 취소 안내");
  assert.equal(cancelled.noticeKind, "cancelled"); assert.match(cancelled.noticeEvidence, /취소/);
  assert.equal(extractEventFromText("CONCERT 2026.09.04 18:00 Venue: Seoul\n延期のお知らせ").noticeKind, "postponed");
  assert.equal(extractEventFromText("CONCERT 2026.09.04 18:00 Venue: Seoul\n일정 변경").noticeKind, "rescheduled");
});
