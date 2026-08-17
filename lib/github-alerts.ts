import { loadLocalState, updateLocalState, type ImportedPost, type SavedNotification, type SourceTrust, type TicketClubLocalState } from "./local-store.ts";

const defaultRepository = "kjin0021-ctrl/ticketclub";

interface CloudAlert {
  kind: string;
  artist: string;
  sourceId: string;
  sourceLabel: string;
  title: string;
  text: string;
  url: string;
  detectedAt: string;
  sourceTrust?: SourceTrust;
}

interface CloudAlertPayload { version: 1; alerts: CloudAlert[]; }
interface GithubIssue { number: number; html_url: string; created_at: string; body: string | null; }

export function parseCloudAlertIssue(body: string | null): CloudAlertPayload | null {
  if (!body?.includes("ticketclub-alert-v1")) return null;
  const match = body.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as Partial<CloudAlertPayload>;
    if (parsed.version !== 1 || !Array.isArray(parsed.alerts)) return null;
    return { version: 1, alerts: parsed.alerts.filter((alert): alert is CloudAlert => Boolean(alert?.artist && alert?.url && alert?.title)) };
  } catch {
    return null;
  }
}

export function mergeCloudIssues(state: TicketClubLocalState, issues: GithubIssue[]) {
  const additions: ImportedPost[] = [];
  const notifications: SavedNotification[] = [];
  const operationalPostIds = new Set<string>();
  for (const issue of issues) {
    const payload = parseCloudAlertIssue(issue.body);
    payload?.alerts.forEach((alert, index) => {
      const id = `github-${issue.number}-${index}`;
      const artist = state.artists.find((item) => item.name.toLocaleLowerCase() === alert.artist.toLocaleLowerCase());
      if (!artist) return;
      if (/连续失败|连接测试|失败|error/i.test(alert.kind) || /信息源需要检查/.test(alert.title)) {
        operationalPostIds.add(id);
        if (!state.notifications.some((item) => item.id === `source-alert-${id}`)) notifications.push({ id: `source-alert-${id}`, kind: "source_failure", title: `${artist.name} 的信息源需要检查`, body: `${alert.sourceLabel}：${alert.text || alert.title}`, sourceId: alert.sourceId, createdAt: alert.detectedAt || issue.created_at });
        return;
      }
      if (state.importedPosts.some((post) => post.id === id)) return;
      additions.push({ id, artistId: artist.id, url: alert.url, text: `${alert.title}\n${alert.text}`, importedAt: alert.detectedAt || issue.created_at, status: "pending", origin: "github_monitor", cloudIssueUrl: issue.html_url, sourceTrust: alert.sourceTrust ?? "media" });
    });
  }
  const importedPosts = [...additions, ...state.importedPosts.filter((post) => !operationalPostIds.has(post.id))].slice(0, 200);
  return additions.length || notifications.length || operationalPostIds.size ? { ...state, importedPosts, notifications: [...notifications, ...state.notifications].slice(0, 200) } : state;
}

export async function syncGithubAlerts(repository = process.env.NEXT_PUBLIC_GITHUB_REPOSITORY ?? defaultRepository) {
  if (!repository) return loadLocalState();
  const response = await fetch(`https://api.github.com/repos/${repository}/issues?state=open&labels=ticketclub-alert&per_page=30`, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`GitHub alerts returned ${response.status}`);
  const issues = await response.json() as GithubIssue[];
  return updateLocalState((state) => mergeCloudIssues(state, issues));
}
