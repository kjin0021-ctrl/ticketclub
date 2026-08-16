import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server renders the TicketClub home experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /TicketClub 票来/);
  assert.match(html, /等待下一张真实票根/);
  assert.match(html, /还没有确认过的真实活动/);
  assert.doesNotMatch(html, /Summer Memory Club|Inkigayo|Music Bank|Fan Signing/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps adjustable design values and unverified events out of production UI", async () => {
  const [css, home, button] = await Promise.all([
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("components/TicketClubHome.tsx", root), "utf8"),
    readFile(new URL("components/ui/Button.tsx", root), "utf8"),
  ]);

  assert.match(css, /TICKETCLUB ADJUSTMENT PANEL/);
  assert.match(css, /--tc-button-height/);
  assert.match(css, /--tc-text-page-title/);
  assert.doesNotMatch(home, /mock-data|featuredEvent|nearbyEvents/);
  assert.match(home, /confirmedImportedEvents/);
  assert.match(home, /EventDecisionFlow/);
  assert.match(button, /ButtonHTMLAttributes/);
  assert.doesNotMatch(home, /#e8cdd8|#6c6d6a/);
});
