import assert from "node:assert/strict";
import test from "node:test";
import { buildXProfileUrl, isPublicAnnouncementUrl, isXPostUrl, normalizeXHandle } from "../lib/source-adapters.ts";

test("normalizes real X profile inputs", () => {
  assert.equal(normalizeXHandle("@We_KiiiKiii"), "We_KiiiKiii");
  assert.equal(normalizeXHandle("https://x.com/We_KiiiKiii"), "We_KiiiKiii");
  assert.equal(buildXProfileUrl("@artist"), "https://x.com/artist");
});

test("rejects unrelated domains and recognizes post URLs", () => {
  assert.equal(normalizeXHandle("https://example.com/artist"), "");
  assert.equal(isXPostUrl("https://x.com/artist/status/123456789"), true);
  assert.equal(isXPostUrl("https://x.com/artist"), false);
});

test("accepts secure public announcement links without pretending they are X posts", () => {
  assert.equal(isPublicAnnouncementUrl("https://tickets.interpark.com/contents/notice/detail/13375"), true);
  assert.equal(isPublicAnnouncementUrl("javascript:alert(1)"), false);
  assert.equal(isPublicAnnouncementUrl("http://example.com/event"), false);
});
