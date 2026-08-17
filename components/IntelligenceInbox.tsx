"use client";

import { ArrowLeft, ArrowSquareOut, ArrowsClockwise, Check, Clock, Info, Trash, Tray, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { extractEventFromText, extractEventsFromText, type ExtractedEventDraft, type FieldConfidence } from "../lib/event-extractor";
import { createEventFingerprint, findPossibleEventUpdate, loadLocalState, resolveImportedPost, resolveImportedPostBatch, type ConfirmedImportedEvent, type ImportedPost, type SavedArtist, type SourceTrust, type TicketClubLocalState } from "../lib/local-store";
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
        {selected ? <PostReview key={selected.id} post={selected} artist={artist} confirmedEvents={data.confirmedImportedEvents} onResolve={resolved} /> : null}
      </div>}
  </section>;
}

function PostReview({ post, artist, confirmedEvents, onResolve }: { post: ImportedPost; artist?: SavedArtist; confirmedEvents: ConfirmedImportedEvent[]; onResolve: (state: TicketClubLocalState) => void }) {
  const extracted = useMemo(() => extractEventsFromText(post.text ?? ""), [post.text]);
  const [drafts, setDrafts] = useState<ExtractedEventDraft[]>(extracted);
  const [activeDraftIndex, setActiveDraftIndex] = useState(0);
  const draft = drafts[activeDraftIndex] ?? drafts[0];
  const [sourceText, setSourceText] = useState(post.text ?? "");

  function update<K extends keyof ExtractedEventDraft>(key: K, value: ExtractedEventDraft[K]) {
    setDrafts((current) => current.map((item, index) => index === activeDraftIndex ? { ...item, [key]: value } : item));
  }

  function updateKeyTime(key: keyof ExtractedEventDraft["keyTimes"], value: string) {
    setDrafts((current) => current.map((item, index) => index === activeDraftIndex ? { ...item, time: key === "start" ? value : item.time,
      keyTimes: { ...item.keyTimes, [key]: { ...item.keyTimes[key], time: value, confidence: value ? "high" : "missing" } } } : item));
  }

  function rerun() {
    setDrafts(extractEventsFromText(sourceText));
    setActiveDraftIndex(0);
  }

  function confirm() {
    if (!drafts.every(isCompleteDraft)) return;
    const events = drafts.map((item) => draftToEvent(item, post));
    const updateIds = events.map((event) => findPossibleEventUpdate(confirmedEvents, event)?.id);
    onResolve(resolveImportedPostBatch(post.id, events, updateIds));
  }

  const canConfirm = drafts.length > 0 && drafts.every(isCompleteDraft);
  const previewFingerprint = canConfirm ? createEventFingerprint(post.artistId, `${draft.date}T${draft.time}:00+09:00`, draft.title) : "";
  const possibleUpdate = canConfirm ? findPossibleEventUpdate(confirmedEvents, { artistId: post.artistId, title: draft.title, dedupeFingerprint: previewFingerprint }) : undefined;
  const updateChanges = possibleUpdate ? describeChanges(possibleUpdate, draft) : [];

  return <div className="review-workspace">
    <section className="source-evidence">
      <header><div><strong>{artist?.name ?? "未知艺人"}</strong><span>{post.origin === "github_monitor" ? "云端公开来源监测 · 待确认" : "手动导入 · 原文保留"} · {sourceTrustLabel(post.sourceTrust)}</span></div><a href={post.url} target="_blank" rel="noreferrer">{post.origin === "manual_x" ? "在 X 查看" : "查看公开来源"} <ArrowSquareOut size={15} /></a></header>
      <label><span>帖子正文</span><textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={8} placeholder="如果只有链接，请从 X 复制正文到这里" /></label>
      <Button tone="secondary" onClick={rerun}>重新免费识别</Button>
      <aside><Info size={18} /><p>当前使用日期、时间、活动关键词和地点规则，不会产生 API 费用。云端页面变化不是正式行程；没有识别出的字段必须查看来源并手动确认。</p></aside>
    </section>

    <section className="extraction-sheet">
      <header><div><h2>{draft.isLikelyEvent ? "可能是公开行程" : "信息不足，暂不确定"}</h2><p>{draft.isLikelyEvent ? "日期与活动类型已经匹配，请核对其他字段。" : "补充正文或手动填写后仍可保存。"}</p></div><span className={draft.isLikelyEvent ? "is-likely" : ""}><WarningCircle size={16} /> {draft.isLikelyEvent ? "可能是行程" : "需人工判断"}</span></header>
      {draft.noticeKind !== "new_event" ? <section className={`notice-warning notice-warning--${draft.noticeKind}`}><WarningCircle size={21} weight="fill" /><div><strong>{noticeKindLabel(draft.noticeKind)}</strong><p>识别依据：{draft.noticeEvidence || "公告中出现了变更关键词"}。确认前请打开原始来源核对。</p></div></section> : null}
      {drafts.length > 1 ? <nav className="event-split-tabs" aria-label="公告中的多个场次"><div><strong>识别到 {drafts.length} 个场次</strong><small>逐场核对，确认后分别进入行程</small></div><div>{drafts.map((item, index) => <button key={`${item.date}-${index}`} type="button" aria-pressed={index === activeDraftIndex} onClick={() => setActiveDraftIndex(index)}><span>{index + 1}</span>{item.city || "待填城市"}<small>{item.date || "待填日期"}</small></button>)}</div></nav> : null}
      <div className="extraction-form">
        <ReviewField label="活动标题" confidence="medium"><input value={draft.title} onChange={(event) => update("title", event.target.value)} /></ReviewField>
        <ReviewField label="活动类型" confidence={draft.confidence.eventType}><select value={draft.eventType} onChange={(event) => update("eventType", event.target.value)}><option>FAN MEETING</option><option>FAN SIGNING</option><option>CONCERT</option><option>MUSIC SHOW</option><option>FESTIVAL</option><option>OTHER OFFLINE EVENT</option></select></ReviewField>
        <ReviewField label="日期" confidence={draft.confidence.date}><input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} /></ReviewField>
        <ReviewField label="正式开始时间" confidence={draft.keyTimes.start.confidence}><input type="time" value={draft.time} onChange={(event) => updateKeyTime("start", event.target.value)} /></ReviewField>
        <ReviewField label="场馆" confidence={draft.confidence.venue}><input value={draft.venue} onChange={(event) => update("venue", event.target.value)} placeholder="需要精确场馆名称" /></ReviewField>
        <ReviewField label="城市" confidence={draft.city ? "high" : "missing"}><input value={draft.city} onChange={(event) => update("city", event.target.value)} placeholder="例如 Seoul" /></ReviewField>
      </div>
      <section className="key-time-editor" aria-labelledby="key-time-title">
        <div><Clock size={18} /><span><strong id="key-time-title">公告时间轴</strong><small>没有写明的时间保持空白，不做猜测</small></span></div>
        <div className="key-time-grid">
          {([ ["ticketing", "开票"], ["checkIn", "集合 / 签到"], ["rehearsal", "彩排 / Soundcheck"], ["doors", "入场"] ] as const).map(([key, label]) => <label key={key}><span>{label}</span><input type="time" value={draft.keyTimes[key].time} onChange={(event) => updateKeyTime(key, event.target.value)} />{draft.keyTimes[key].evidence ? <small title={draft.keyTimes[key].evidence}>原文：{draft.keyTimes[key].evidence}</small> : <small>公告未写明</small>}</label>)}
        </div>
      </section>
      {draft.evidence.length ? <section className="extraction-evidence"><strong>识别依据</strong><ul>{draft.evidence.map((item, index) => <li key={`${item.field}-${index}`}><span>{evidenceLabel(item.field)}</span><q>{item.excerpt}</q></li>)}</ul></section> : null}
      {possibleUpdate ? <section className="event-update-review"><ArrowsClockwise size={20} /><div><strong>发现同名活动，可能是行程变更</strong><p>不会自动覆盖，请确认以下差异：</p><ul>{updateChanges.map((change) => <li key={change}>{change}</li>)}</ul></div></section> : null}
      <footer><Button tone="quiet" icon={<Trash size={16} />} onClick={() => onResolve(resolveImportedPost(post.id, "ignored"))}>不是行程</Button><Button tone="primary" icon={<Check size={17} weight="bold" />} disabled={!canConfirm} onClick={confirm}>{drafts.length > 1 ? `确认 ${drafts.length} 个场次` : possibleUpdate ? "确认更新这场活动" : "确认并加入艺人行程"}</Button></footer>
    </section>
  </div>;
}

function evidenceLabel(field: string) {
  return ({ date: "日期", venue: "场馆", city: "城市", eventType: "类型", ticketing: "开票", checkIn: "签到", rehearsal: "彩排", doors: "入场", start: "开始" } as Record<string, string>)[field] ?? field;
}

function sourceTrustLabel(value?: SourceTrust) { return ({ artist_official: "艺人官方", organizer_official: "主办方官方", ticketing_official: "官方票务", media: "媒体来源", fan: "粉丝整理" } as Record<SourceTrust, string>)[value ?? "fan"]; }
function noticeKindLabel(value: ExtractedEventDraft["noticeKind"]) { return ({ new_event: "新活动", rescheduled: "检测到改期", postponed: "检测到延期", cancelled: "检测到取消" } as const)[value]; }

function describeChanges(existing: ConfirmedImportedEvent, draft: ExtractedEventDraft) {
  const nextStart = `${draft.date}T${draft.time}:00+09:00`;
  const changes = [existing.startsAt === nextStart ? "" : `时间：${formatEventInstant(existing.startsAt)} → ${formatEventInstant(nextStart)}`, existing.venue === draft.venue ? "" : `场馆：${existing.venue} → ${draft.venue}`, existing.city === draft.city ? "" : `城市：${existing.city} → ${draft.city}`, existing.eventType === draft.eventType ? "" : `类型：${existing.eventType} → ${draft.eventType}`].filter(Boolean);
  return changes.length ? changes : ["核心字段相同，将只合并新的来源证据"];
}

function formatEventInstant(value: string) { return value.slice(0, 16).replace("T", " "); }

function isCompleteDraft(draft: ExtractedEventDraft) { return Boolean(draft.title && draft.date && draft.time && draft.venue && draft.city); }

function draftToEvent(draft: ExtractedEventDraft, post: ImportedPost): ConfirmedImportedEvent {
  const startsAt = `${draft.date}T${draft.time}:00+09:00`;
  return { id: crypto.randomUUID(), artistId: post.artistId, sourcePostIds: [post.id], title: draft.title, eventType: draft.eventType, startsAt, venue: draft.venue,
    ticketingAt: draft.keyTimes.ticketing.time ? `${draft.date}T${draft.keyTimes.ticketing.time}:00+09:00` : undefined,
    checkInAt: draft.keyTimes.checkIn.time ? `${draft.date}T${draft.keyTimes.checkIn.time}:00+09:00` : undefined,
    rehearsalAt: draft.keyTimes.rehearsal.time ? `${draft.date}T${draft.keyTimes.rehearsal.time}:00+09:00` : undefined,
    doorsAt: draft.keyTimes.doors.time ? `${draft.date}T${draft.keyTimes.doors.time}:00+09:00` : undefined,
    city: draft.city, countryCode: draft.countryCode || "KR", confirmedAt: new Date().toISOString(), dedupeFingerprint: createEventFingerprint(post.artistId, startsAt, draft.title), extractionEvidence: draft.evidence, status: draft.noticeKind === "cancelled" ? "cancelled" : draft.noticeKind === "postponed" ? "postponed" : "scheduled" };
}

function ReviewField({ label, confidence, children }: { label: string; confidence: FieldConfidence; children: ReactNode }) {
  return <label className="review-field"><span>{label}<small className={`confidence confidence--${confidence}`}>{confidenceLabels[confidence]}</small></span>{children}</label>;
}
