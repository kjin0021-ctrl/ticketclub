const maxPageBytes = 1_000_000;

function isBlockedIpv4(hostname: string) {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return false;
  const [a, b] = parts.map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function validatePublicAnnouncementUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (url.protocol !== "https:") return { ok: false as const, error: "只支持 HTTPS 公共页面。" };
    if (url.username || url.password || (url.port && url.port !== "443")) return { ok: false as const, error: "链接不能包含账号、密码或自定义端口。" };
    if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal") || isBlockedIpv4(hostname) || hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80")) {
      return { ok: false as const, error: "不能读取本机或内网地址。" };
    }
    if (["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(hostname)) return { ok: false as const, error: "X 页面无法稳定自动读取，请同时粘贴帖子正文。" };
    return { ok: true as const, url };
  } catch {
    return { ok: false as const, error: "请输入完整、有效的 HTTPS 链接。" };
  }
}

function decodeEntities(value: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? match;
    const code = entity[1].toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : match;
  });
}

function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const first = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"));
  const reversed = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["']`, "i"));
  return decodeEntities(first?.[1] ?? reversed?.[1] ?? "");
}

export function extractReadablePageText(html: string) {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const description = metaContent(html, "description") || metaContent(html, "og:description");
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(?:p|div|li|article|section|h[1-6]|dt|dd|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const lines = decodeEntities([title, description, body].filter(Boolean).join("\n"))
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2 && line.length <= 1200);
  return [...new Set(lines)].join("\n").slice(0, 120_000);
}

export function focusAnnouncementText(text: string) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const schedulePattern = /공연\s?일시|공연\s?일정|event\s?date|show\s?date|performance\s?date|演出(?:日期|时间)|演出日程|公演日時|開催日時/i;
  const venuePattern = /공연\s?장소|공연장|venue|location|场馆|場館|会場/i;
  const scheduleIndex = lines.findIndex((line) => schedulePattern.test(line));
  if (scheduleIndex < 0) return text;
  const titleCandidate = lines.slice(0, scheduleIndex).find((line) => /concert|fan\s?meeting|fan\s?sign|festival|live|콘서트|팬미팅|팬사인회|페스티벌|演唱会|见面会|签售|音乐节|コンサート|ファンミーティング/i.test(line)) ?? lines[0];
  const titleLine = titleCandidate.includes("|") ? titleCandidate.split("|").at(-1)!.trim() : titleCandidate;
  const venueLine = lines.slice(scheduleIndex + 1, scheduleIndex + 10).find((line) => venuePattern.test(line));
  const scheduleLines = lines[scheduleIndex].replace(/\s*\/\s*(?=20\d{2})/g, "\n").split("\n");
  return [...new Set([titleLine, ...scheduleLines, venueLine].filter((line): line is string => Boolean(line)))].join("\n");
}

async function limitedText(response: Response) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxPageBytes) throw new Error("页面内容超过 1 MB，无法安全读取。");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let output = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxPageBytes) { await reader.cancel(); throw new Error("页面内容超过 1 MB，无法安全读取。"); }
    output += decoder.decode(value, { stream: true });
  }
  return output + decoder.decode();
}

export async function readPublicAnnouncementPage(value: string, fetcher: typeof fetch = fetch) {
  let checked = validatePublicAnnouncementUrl(value);
  if (!checked.ok) throw new Error(checked.error);
  let current = checked.url;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetcher(current, { redirect: "manual", headers: { Accept: "text/html,application/xhtml+xml,text/plain;q=0.8", "User-Agent": "TicketClub/0.1 (+public announcement reader)" }, signal: AbortSignal.timeout(15_000) });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === 3) throw new Error("页面重定向次数过多。");
      checked = validatePublicAnnouncementUrl(new URL(location, current).toString());
      if (!checked.ok) throw new Error(checked.error);
      current = checked.url;
      continue;
    }
    if (!response.ok) throw new Error(`来源页面返回 HTTP ${response.status}。`);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml") && !contentType.includes("text/plain")) throw new Error("该链接不是可读取的网页正文，请改为粘贴公告正文。");
    const html = await limitedText(response);
    const text = focusAnnouncementText(contentType.includes("text/plain") ? html.trim() : extractReadablePageText(html));
    if (text.length < 40) throw new Error("页面没有足够的可读文字，可能需要登录或使用 JavaScript。请补充公告正文。");
    return { url: current.toString(), title: decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim(), text };
  }
  throw new Error("无法读取该页面。");
}
