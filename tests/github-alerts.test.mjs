import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyLocalState } from "../lib/local-store.ts";
import { mergeCloudIssues, parseCloudAlertIssue } from "../lib/github-alerts.ts";

const payload = { version: 1, alerts: [{ kind: "公开页面有更新", artist: "KiiiKiii", sourceId: "source-1", sourceLabel: "Official news", title: "Official news updated", text: "2026.09.12 FAN MEETING 18:00 Venue: Seoul Hall", url: "https://example.com/news", detectedAt: "2026-08-17T00:00:00Z" }] };
const issue = { number: 12, html_url: "https://github.com/example/ticketclub/issues/12", created_at: "2026-08-17T00:00:00Z", body: `<!-- ticketclub-alert-v1 -->\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`` };

test("parses only versioned TicketClub alert issues", () => {
  assert.deepEqual(parseCloudAlertIssue(issue.body), payload);
  assert.equal(parseCloudAlertIssue("ordinary issue"), null);
});

test("cloud alerts enter the confirmation inbox once", () => {
  const first = mergeCloudIssues(createEmptyLocalState(), [issue]);
  assert.equal(first.importedPosts.length, 1);
  assert.equal(first.importedPosts[0].origin, "github_monitor");
  assert.equal(first.importedPosts[0].status, "pending");
  const second = mergeCloudIssues(first, [issue]);
  assert.equal(second.importedPosts.length, 1);
});

test("source failures go to notifications instead of the event inbox", () => {
  const failurePayload = { version: 1, alerts: [{ kind: "连续失败 3 次", artist: "KiiiKiii", sourceId: "source-1", sourceLabel: "Official news", title: "信息源需要检查", text: "HTTP 503", url: "https://example.com/news", detectedAt: "2026-08-17T00:00:00Z" }] };
  const failureIssue = { ...issue, number: 13, body: `<!-- ticketclub-alert-v1 -->\n\`\`\`json\n${JSON.stringify(failurePayload)}\n\`\`\`` };
  const state = createEmptyLocalState();
  state.importedPosts.push({ id: "github-13-0", artistId: "artist-kiiikiii", url: "https://example.com/news", text: "信息源需要检查", importedAt: "2026-08-17T00:00:00Z", status: "pending", origin: "github_monitor" });
  const merged = mergeCloudIssues(state, [failureIssue]);
  assert.equal(merged.importedPosts.length, 0);
  assert.equal(merged.notifications.length, 1);
  assert.equal(merged.notifications[0].kind, "source_failure");
  assert.equal(mergeCloudIssues(merged, [failureIssue]).notifications.length, 1);
});
