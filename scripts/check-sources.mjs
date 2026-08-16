import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import nodemailer from "nodemailer";

const configPath = process.env.TICKETCLUB_CONFIG ?? "config/ticketclub.json";
const statePath = process.env.TICKETCLUB_STATE ?? ".ticketclub-state.json";
const config = JSON.parse(await readFile(configPath, "utf8"));
const localHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: config.timezone ?? "UTC", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
if (process.env.CHECK_LOCAL_NOON === "true" && localHour !== 12) {
  console.log(`TicketClub: local hour is ${localHour}; waiting for noon.`);
  process.exit(0);
}
const previous = await readFile(statePath, "utf8").then(JSON.parse).catch(() => ({ sources: {} }));
const next = { checkedAt: new Date().toISOString(), sources: { ...previous.sources } };
const alerts = [];
const cancellationPattern = /cancel(?:led|lation)?|postpone(?:d|ment)?|reschedule(?:d)?|取消|延期|中止|취소|연기/i;

if (process.env.TICKETCLUB_TEST_EMAIL === "true") {
  alerts.push({
    kind: "连接测试",
    source: { id: "ticketclub", artist: "TicketClub" },
    item: {
      title: "邮件提醒已经连接成功",
      description: "这是一次手动测试，没有读取或修改任何艺人行程。",
      link: "https://github.com/kjin0021-ctrl/ticketclub/actions",
    },
  });
}

function decode(value = "") {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function entries(xml) {
  const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  return blocks.slice(0, 40).map((block) => {
    const field = (name) => decode(block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "");
    const title = field("title");
    const description = field("description") || field("content") || field("summary");
    const link = field("link") || block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] || "";
    const id = field("guid") || field("id") || link || title;
    return { id, title, description, link, hash: createHash("sha256").update(`${title}|${description}|${link}`).digest("hex") };
  }).filter((item) => item.id);
}

for (const source of config.sources ?? []) {
  const old = previous.sources[source.id] ?? { items: {}, failures: 0 };
  try {
    const response = await fetch(source.url, { headers: { Accept: "application/rss+xml, application/atom+xml, text/xml" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const items = entries(await response.text());
    if (!items.length) throw new Error("订阅没有可读取的条目");
    const current = Object.fromEntries(items.map((item) => [item.id, item.hash]));
    if (Object.keys(old.items ?? {}).length) {
      for (const item of items) {
        if (!old.items[item.id]) alerts.push({ kind: cancellationPattern.test(`${item.title} ${item.description}`) ? "取消或延期" : "新活动线索", source, item });
        else if (old.items[item.id] !== item.hash) alerts.push({ kind: "信息变更", source, item });
      }
    }
    next.sources[source.id] = { items: current, failures: 0, checkedAt: next.checkedAt };
  } catch (error) {
    const failures = (old.failures ?? 0) + 1;
    next.sources[source.id] = { ...old, failures, checkedAt: next.checkedAt, error: error instanceof Error ? error.message : String(error) };
    if (failures === 3) alerts.push({ kind: "连续失败 3 次", source, item: { title: "信息源需要检查", description: next.sources[source.id].error, link: source.url } });
  }
}

await writeFile(statePath, `${JSON.stringify(next, null, 2)}\n`);

if (!alerts.length) {
  console.log("TicketClub: no changes; staying quiet.");
  process.exit(0);
}

const required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "NOTIFY_EMAIL"];
const missing = required.filter((name) => !process.env[name]);
const text = alerts.map(({ kind, source, item }) => `[${kind}] ${source.artist ?? source.id}\n${item.title}\n${item.description}\n${item.link}`).join("\n\n---\n\n");
let delivered = false;

if (!missing.length) {
  const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 465), secure: (process.env.SMTP_SECURE ?? "true") !== "false", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  try {
    await transporter.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to: process.env.NOTIFY_EMAIL, subject: `TicketClub · ${alerts.length} 条行程变化`, text });
    console.log(`TicketClub: sent ${alerts.length} alert(s) by email.`);
    delivered = true;
  } catch (error) {
    console.warn(`TicketClub: email failed (${error instanceof Error ? error.message.split("\n")[0] : "unknown error"}); trying GitHub Issues.`);
  }
}

if (!delivered && process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
  const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/issues`, {
    method: "POST",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
    body: JSON.stringify({ title: `TicketClub · ${alerts.length} 条行程提醒`, body: `${text}\n\n---\n由 TicketClub 自动检查创建。处理后可关闭此 Issue。` }),
  });
  if (response.ok) {
    console.log("TicketClub: delivered alerts through a GitHub Issue fallback.");
    delivered = true;
  } else {
    console.error(`TicketClub: GitHub Issue fallback failed with HTTP ${response.status}.`);
  }
}

if (!delivered) {
  console.log(JSON.stringify(alerts, null, 2));
  console.error(`TicketClub: alerts could not be delivered. Missing email settings: ${missing.join(", ") || "none"}.`);
  process.exitCode = 2;
}
