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
  assert.match(html, /Summer Memory Club/);
  assert.match(html, /标准模式下赶得上/);
  assert.match(html, /旅行期间附近场次/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps adjustable design values and mock data out of components", async () => {
  const [css, mockData, home, button] = await Promise.all([
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("lib/mock-data.ts", root), "utf8"),
    readFile(new URL("components/TicketClubHome.tsx", root), "utf8"),
    readFile(new URL("components/ui/Button.tsx", root), "utf8"),
  ]);

  assert.match(css, /TICKETCLUB ADJUSTMENT PANEL/);
  assert.match(css, /--tc-button-height/);
  assert.match(css, /--tc-text-page-title/);
  assert.match(mockData, /MOCK DATA/);
  assert.match(mockData, /featuredEvent/);
  assert.match(home, /aria-pressed/);
  assert.match(home, /EventDecisionFlow/);
  assert.match(button, /ButtonHTMLAttributes/);
  assert.doesNotMatch(home, /#e8cdd8|#6c6d6a/);
});
