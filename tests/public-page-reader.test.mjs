import assert from "node:assert/strict";
import test from "node:test";
import { extractReadablePageText, focusAnnouncementText, readPublicAnnouncementPage, validatePublicAnnouncementUrl } from "../lib/public-page-reader.ts";

test("rejects X, local addresses and non-HTTPS links", () => {
  assert.equal(validatePublicAnnouncementUrl("https://x.com/artist/status/1").ok, false);
  assert.equal(validatePublicAnnouncementUrl("https://127.0.0.1/private").ok, false);
  assert.equal(validatePublicAnnouncementUrl("http://tickets.example.com/event").ok, false);
  assert.equal(validatePublicAnnouncementUrl("https://tickets.interpark.com/event").ok, true);
});

test("turns a ticket page into line-based multilingual evidence", () => {
  const text = extractReadablePageText(`<!doctype html><html><head><title>KiiiKiii FAN CONCERT</title><meta name="description" content="Official ticket notice"></head><body><article><p>- 공연일시: 2026년 5월 16일 6PM (KST)</p><p>- 공연장소: 블루스퀘어 우리WON뱅킹홀, 서울</p></article><script>ignore me</script></body></html>`);
  assert.match(text, /KiiiKiii FAN CONCERT/);
  assert.match(text, /2026년 5월 16일 6PM/);
  assert.match(text, /블루스퀘어/);
  assert.doesNotMatch(text, /ignore me/);
});

test("focuses a ticket page on the main performance instead of ticket sales and recommendations", () => {
  const focused = focusAnnouncementText(["NOL | KiiiKiii FAN CONCERT", "공연일시: 2026년 5월 16일 6PM / 2026년 5월 17일 5PM", "공연장소: 블루스퀘어 우리WON뱅킹홀", "팬클럽 선예매: 2026년 4월 15일 19:00", "OTHER CONCERT 2026년 9월 2일 20:00"].join("\n"));
  assert.match(focused, /5월 16일 6PM\n2026년 5월 17일 5PM/);
  assert.match(focused, /블루스퀘어/);
  assert.doesNotMatch(focused, /선예매|OTHER CONCERT/);
});

test("reads a public page and follows only validated redirects", async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url.toString());
    if (calls.length === 1) return new Response(null, { status: 302, headers: { location: "https://tickets.example.com/final" } });
    return new Response("<title>FAN MEETING</title><p>2026.08.29 18:00</p><p>Venue: YES24 Live Hall, Seoul</p>", { headers: { "content-type": "text/html" } });
  };
  const result = await readPublicAnnouncementPage("https://tickets.example.com/start", fetcher);
  assert.equal(calls.length, 2);
  assert.equal(result.url, "https://tickets.example.com/final");
  assert.match(result.text, /YES24 Live Hall/);
});

test("blocks a redirect from a public page into a private address", async () => {
  await assert.rejects(() => readPublicAnnouncementPage("https://tickets.example.com/start", async () => new Response(null, { status: 302, headers: { location: "https://192.168.1.2/private" } })), /内网/);
});
