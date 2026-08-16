"use client";

import { ArrowLeft, ArrowSquareOut, CheckCircle, ClipboardText, DownloadSimple, EnvelopeSimple, GithubLogo, Rss } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { loadLocalState } from "../lib/local-store";
import { Button } from "./ui/Button";

const secretNames = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "NOTIFY_EMAIL"];

export function DeploymentSetup({ onBack }: { onBack: () => void }) {
  const local = loadLocalState();
  const rssSources = local.sources.filter((source) => source.kind === "rsshub");
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState("");

  const config = useMemo(() => ({
    timezone,
    sources: rssSources.map((source) => ({
      id: source.id,
      artist: local.artists.find((artist) => artist.id === source.artistId)?.name ?? "Unknown artist",
      url: source.url,
    })),
  }), [local.artists, rssSources, timezone]);

  function downloadConfig() {
    const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ticketclub.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1600);
  }

  return <section className="deployment-setup">
    <header className="deployment-heading">
      <Button tone="quiet" icon={<ArrowLeft size={18} />} onClick={onBack}>返回</Button>
      <div><h1>让 TicketClub 每天自己检查</h1><p>一次设置，之后按你的时区中午运行。有变化才发邮件。</p></div>
      <span>SETUP PASS</span>
    </header>

    <div className="deployment-layout">
      <ol className="setup-steps">
        <li className="is-current"><span>1</span><div><strong>生成订阅配置</strong><small>{rssSources.length} 个 RSS 来源</small></div></li>
        <li><span>2</span><div><strong>设置邮件 Secrets</strong><small>密码不进入文件</small></div></li>
        <li><span>3</span><div><strong>首次运行</strong><small>只建立检查基线</small></div></li>
      </ol>

      <div className="setup-workspace">
        <section className="setup-ticket setup-ticket--blue">
          <header><Rss size={24} /><div><h2>01 · 生成配置文件</h2><p>网页只导出已经连接的 RSS 来源，不会导出 X 密码或邮箱密码。</p></div></header>
          <label><span>每天中午所用时区</span><input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Australia/Melbourne" /></label>
          {rssSources.length ? <div className="export-source-list">{config.sources.map((source) => <div key={source.id}><CheckCircle size={18} weight="fill" /><span><strong>{source.artist}</strong><small>{source.url}</small></span></div>)}</div> : <div className="setup-warning"><strong>还没有 RSS 来源</strong><p>请先回到“艺人与信息源”连接一个可读取的 RSS 地址。你仍可下载空配置用于检查工作流是否启动。</p></div>}
          <footer><Button tone="primary" icon={<DownloadSimple size={17} />} onClick={downloadConfig}>下载 ticketclub.json</Button><p>把文件放进仓库的 <code>config/</code>，替换示例文件。</p></footer>
        </section>

        <section className="setup-ticket">
          <header><EnvelopeSimple size={24} /><div><h2>02 · 设置邮件</h2><p>GitHub 加密保存这些值；TicketClub 页面不会保存 SMTP 密码。</p></div></header>
          <label><span>接收提醒的邮箱（仅用于帮你核对）</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <div className="smtp-example"><div><span>Gmail 推荐值</span><button onClick={() => copy("smtp.gmail.com", "host")}>{copied === "host" ? "已复制" : "复制主机"}</button></div><code>SMTP_HOST=smtp.gmail.com<br />SMTP_PORT=465<br />SMTP_SECURE=true<br />NOTIFY_EMAIL={email || "你的收件邮箱"}</code></div>
          <div className="secret-strip" aria-label="需要创建的 GitHub Secrets">{secretNames.map((name) => <button key={name} type="button" onClick={() => copy(name, name)}>{copied === name ? "COPIED" : name}</button>)}</div>
          <footer><a className="setup-link" href="https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions" target="_blank" rel="noreferrer">查看 GitHub Secrets 官方说明 <ArrowSquareOut size={15} /></a><p>Gmail 的 SMTP_PASS 应填写 App Password，不是登录密码。</p></footer>
        </section>

        <section className="setup-ticket setup-ticket--pink">
          <header><GithubLogo size={25} weight="fill" /><div><h2>03 · 运行第一次检查</h2><p>提交配置后，在仓库 Actions 页面手动运行一次工作流。</p></div></header>
          <div className="action-route"><span>Actions</span><i>→</i><span>TicketClub daily check</span><i>→</i><span>Run workflow</span></div>
          <div className="baseline-note"><ClipboardText size={20} /><p><strong>第一次不会发送旧帖子。</strong>它只记录当前内容作为基线；从第二次开始，有新增、变更或取消才发邮件。</p></div>
          <footer><p>看到绿色完成标记后，自动检查就已经开始。连续三次读取失败时也会收到邮件。</p></footer>
        </section>
      </div>
    </div>
  </section>;
}
