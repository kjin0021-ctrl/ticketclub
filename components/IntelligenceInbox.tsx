"use client";

import { ArrowLeft, ArrowSquareOut, Check, Info, Trash, Tray, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { extractEventFromText, type ExtractedEventDraft, type FieldConfidence } from "../lib/event-extractor";
import { createEventFingerprint, loadLocalState, resolveImportedPost, type ImportedPost, type SavedArtist, type TicketClubLocalState } from "../lib/local-store";
import { Button } from "./ui/Button";

interface IntelligenceInboxProps { onBack: () => void; }

const confidenceLabels: Record<FieldConfidence, string> = { high: "已识别", medium: "请核对", missing: "需填写" };

export function IntelligenceInbox({ onBack }: IntelligenceInboxProps) {
  const [data, setData] = useState<TicketClubLocalState>(() => loadLocalState());
  const pending = data.importedPosts.filter((post) => (post.status ?? "pending") === "pending");
  const [selectedId, setSelectedId] = useState(pending[0]?.id ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const latest = loadLocalState();
      setData(latest);
      setSelectedId((current) => current || latest.importedPosts.find((post) => (post.status ?? "pending") === "pending")?.id || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selected = pending.find((post) => post.id === selectedId) ?? pending[0];
  const artist = data.artists.find((item) => item.id === selected?.artistId);

  function resolved(next: TicketClubLocalState) {
    setData(next);
    const nextPending = next.importedPosts.find((post) => (post.status ?? "pending") === "pending" && post.id !== selected?.id);
    setSelectedId(nextPending?.id ?? "");
  }

  return <section className="intel-inbox" aria-labelledby="intel-title">
    <header className="inbox-heading">
      <button className="back-button" type="button" onClick={onBack} aria-label="返回行程首页"><ArrowLeft size={20} /></button>
      <div><h1 id="intel-title">待识别收件箱</h1><p>原帖是证据；识别结果必须由你确认后才会成为正式行程。</p></div>
      <span className="inbox-count">{pending.length} 条待处理</span>
    </header>

    {pending.length === 0 ? <section className="inbox-empty"><Tray size={36} /><h2>现在没有待确认的帖子</h2><p>前往艺人管理，粘贴 X 帖子链接和正文；RSS 自动读取的内容之后也会进入这里。</p><Button tone="secondary" onClick={onBack}>返回行程</Button></section> :
      <div className="inbox-layout">
        <aside className="post-queue" aria-label="待识别帖子">
          <header><strong>待处理</strong><span>{pending.length}</span></header>
          {pending.map((post) => {
            const postArtist = data.artists.find((item) => item.id === post.artistId);
            const extraction = extractEventFromText(post.text ?? "");
            return <button key={post.id} type="button" className={post.id === selected?.id ? "is-active" : ""} onClick={() => setSelectedId(post.id)}>
              <span className={`queue-dot ${extraction.isLikelyEvent ? "queue-dot--likely" : ""}`} />
              <span><strong>{postArtist?.name ?? "未知艺人"}</strong><small>{post.text?.slice(0, 52) || "只有链接，等待补充文字"}</small></span>
            </button>;
          })}
        </aside>
        {selected ? <PostReview key={selected.id} post={selected} artist={artist} onResolve={resolved} /> : null}
      </div>}
  </section>;
}

function PostReview({ post, artist, onResolve }: { post: ImportedPost; artist?: SavedArtist; onResolve: (state: TicketClubLocalState) => void }) {
  const extracted = useMemo(() => extractEventFromText(post.text ?? ""), [post.text]);
  const [draft, setDraft] = useState<ExtractedEventDraft>(extracted);
  const [sourceText, setSourceText] = useState(post.text ?? "");

  function update<K extends keyof ExtractedEventDraft>(key: K, value: ExtractedEventDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function rerun() {
    setDraft(extractEventFromText(sourceText));
  }

  function confirm() {
    if (!draft.title || !draft.date || !draft.time || !draft.venue || !draft.city) return;
    const startsAt = `${draft.date}T${draft.time}:00+09:00`;
    onResolve(resolveImportedPost(post.id, "confirmed", {
      id: crypto.randomUUID(), artistId: post.artistId, sourcePostIds: [post.id], title: draft.title,
      eventType: draft.eventType, startsAt, venue: draft.venue,
      city: draft.city, countryCode: draft.countryCode || "KR", confirmedAt: new Date().toISOString(),
      dedupeFingerprint: createEventFingerprint(post.artistId, startsAt, draft.title),
    }));
  }

  const canConfirm = Boolean(draft.title && draft.date && draft.time && draft.venue && draft.city);

  return <div className="review-workspace">
    <section className="source-evidence">
      <header><div><strong>{artist?.name ?? "未知艺人"}</strong><span>{post.origin === "github_monitor" ? "云端公开来源监测 · 待确认" : "手动导入 · 原帖保留"}</span></div><a href={post.url} target="_blank" rel="noreferrer">{post.origin === "github_monitor" ? "查看公开来源" : "在 X 查看"} <ArrowSquareOut size={15} /></a></header>
      <label><span>帖子正文</span><textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={8} placeholder="如果只有链接，请从 X 复制正文到这里" /></label>
      <Button tone="secondary" onClick={rerun}>重新免费识别</Button>
      <aside><Info size={18} /><p>当前使用日期、时间、活动关键词和地点规则，不会产生 API 费用。云端页面变化不是正式行程；没有识别出的字段必须查看来源并手动确认。</p></aside>
    </section>

    <section className="extraction-sheet">
      <header><div><h2>{draft.isLikelyEvent ? "可能是公开行程" : "信息不足，暂不确定"}</h2><p>{draft.isLikelyEvent ? "日期与活动类型已经匹配，请核对其他字段。" : "补充正文或手动填写后仍可保存。"}</p></div><span className={draft.isLikelyEvent ? "is-likely" : ""}><WarningCircle size={16} /> {draft.isLikelyEvent ? "可能是行程" : "需人工判断"}</span></header>
      <div className="extraction-form">
        <ReviewField label="活动标题" confidence="medium"><input value={draft.title} onChange={(event) => update("title", event.target.value)} /></ReviewField>
        <ReviewField label="活动类型" confidence={draft.confidence.eventType}><select value={draft.eventType} onChange={(event) => update("eventType", event.target.value)}><option>FAN MEETING</option><option>FAN SIGNING</option><option>CONCERT</option><option>MUSIC SHOW</option><option>FESTIVAL</option><option>OTHER OFFLINE EVENT</option></select></ReviewField>
        <ReviewField label="日期" confidence={draft.confidence.date}><input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} /></ReviewField>
        <ReviewField label="正式开始时间" confidence={draft.confidence.time}><input type="time" value={draft.time} onChange={(event) => update("time", event.target.value)} /></ReviewField>
        <ReviewField label="场馆" confidence={draft.confidence.venue}><input value={draft.venue} onChange={(event) => update("venue", event.target.value)} placeholder="需要精确场馆名称" /></ReviewField>
        <ReviewField label="城市" confidence={draft.city ? "high" : "missing"}><input value={draft.city} onChange={(event) => update("city", event.target.value)} placeholder="例如 Seoul" /></ReviewField>
      </div>
      <footer><Button tone="quiet" icon={<Trash size={16} />} onClick={() => onResolve(resolveImportedPost(post.id, "ignored"))}>不是行程</Button><Button tone="primary" icon={<Check size={17} weight="bold" />} disabled={!canConfirm} onClick={confirm}>确认并加入艺人行程</Button></footer>
    </section>
  </div>;
}

function ReviewField({ label, confidence, children }: { label: string; confidence: FieldConfidence; children: ReactNode }) {
  return <label className="review-field"><span>{label}<small className={`confidence confidence--${confidence}`}>{confidenceLabels[confidence]}</small></span>{children}</label>;
}
