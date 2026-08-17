export function normalizeXHandle(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://x.com/${trimmed.replace(/^@/, "")}`);
    if (url.hostname !== "x.com" && url.hostname !== "www.x.com" && url.hostname !== "twitter.com" && url.hostname !== "www.twitter.com") return "";
    return url.pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "") ?? "";
  } catch {
    return trimmed.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
  }
}

export function buildXProfileUrl(handle: string) {
  const normalized = normalizeXHandle(handle);
  return normalized ? `https://x.com/${normalized}` : "";
}

export function isXPostUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return ["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(url.hostname) && /\/status\/\d+/.test(url.pathname);
  } catch {
    return false;
  }
}

export function isPublicAnnouncementUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export interface RssConnectionResult {
  ok: boolean;
  itemCount: number;
  title?: string;
  error?: string;
}

export async function testRssConnection(url: string): Promise<RssConnectionResult> {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return { ok: false, itemCount: 0, error: "RSS 地址必须使用 HTTP 或 HTTPS" };
    }
    const response = await fetch(parsedUrl, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
    if (!response.ok) return { ok: false, itemCount: 0, error: `RSS 服务返回 ${response.status}` };
    const xml = await response.text();
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (document.querySelector("parsererror")) return { ok: false, itemCount: 0, error: "返回内容不是有效 RSS" };
    const items = document.querySelectorAll("item, entry");
    const title = document.querySelector("channel > title, feed > title")?.textContent?.trim();
    return { ok: items.length > 0, itemCount: items.length, title, error: items.length ? undefined : "订阅中暂时没有内容" };
  } catch (error) {
    return { ok: false, itemCount: 0, error: error instanceof Error ? error.message : "无法连接 RSS" };
  }
}
