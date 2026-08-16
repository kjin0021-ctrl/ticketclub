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
