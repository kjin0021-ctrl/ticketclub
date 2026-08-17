"use client";

import { ArrowLeft, ArrowSquareOut, ArrowsClockwise, CalendarBlank, Clock, MapPin, ShieldCheck, StarFour } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { confirmedEventToArtistEvent } from "../lib/event-mappers";
import { loadLocalState, saveAttendance, type ConfirmedImportedEvent, type ImportedPost, type SavedArtist } from "../lib/local-store";
import type { ArtistEvent, AttendanceStatus } from "../lib/types";
import { Button } from "./ui/Button";

const attendanceLabels: Record<AttendanceStatus, string> = { going: "去", considering: "考虑", "not-going": "不去" };

interface Props {
  event: ConfirmedImportedEvent;
  artist?: SavedArtist;
  onBack: () => void;
  onDecide: (event: ArtistEvent) => void;
}

export function ConfirmedEventDetail({ event, artist, onBack, onDecide }: Props) {
  const [attendance, setAttendance] = useState<AttendanceStatus>("considering");
  const [sources, setSources] = useState<ImportedPost[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const local = loadLocalState();
      setAttendance(local.attendanceByEvent[event.id] ?? "considering");
      setSources(local.importedPosts.filter((post) => event.sourcePostIds.includes(post.id)));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [event.id, event.sourcePostIds]);

  const startsAt = new Date(event.startsAt);
  const date = new Intl.DateTimeFormat("zh-CN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Seoul" }).format(startsAt);
  const decisionBasis = event.rehearsalAt ? ["彩排 / Soundcheck", event.rehearsalAt] : event.checkInAt ? ["集合 / 签到时间", event.checkInAt] : ["正式开始时间", event.startsAt];

  function changeAttendance(next: AttendanceStatus) {
    setAttendance(next);
    saveAttendance(event.id, next);
  }

  return <section className="event-dossier" aria-labelledby="event-dossier-title">
    <header className="dossier-topbar">
      <button className="back-button" type="button" onClick={onBack} aria-label="返回首页"><ArrowLeft size={20} /></button>
      <div><p>CONFIRMED EVENT FILE</p><h1 id="event-dossier-title">活动详情</h1></div>
      <span><ShieldCheck size={16} weight="fill" /> 已由你确认</span>
    </header>

    <div className="dossier-layout">
      <article className="dossier-ticket">
        <div className="dossier-ticket__band"><span>EVENT FILE</span><strong>{event.countryCode === "KR" ? "SEOUL CHANNEL" : "WORLD CHANNEL"}</strong></div>
        <div className="dossier-ticket__body">
          <p>{artist?.name ?? "未知艺人"} · {event.eventType}</p>
          <h2>{event.title}</h2>
          {event.status && event.status !== "scheduled" ? <p className={`event-status event-status--${event.status}`}>{event.status === "cancelled" ? "活动已取消" : "活动已延期，等待新日期"}</p> : null}
          <dl>
            <div><dt><CalendarBlank size={17} /> 日期与时间</dt><dd>{date}</dd></div>
            <div><dt><MapPin size={17} /> 场馆</dt><dd>{event.venue}<small>{event.city} · {event.countryCode}</small></dd></div>
            <div><dt><Clock size={17} /> 判断基准</dt><dd>{decisionBasis[0]}<small>{formatKoreaTime(decisionBasis[1])}</small></dd></div>
          </dl>
        </div>
        <div className="dossier-attendance">
          <div><span>MY RSVP</span><strong>这场活动，你想去吗？</strong></div>
          <div className="attendance-control" aria-label="参加状态">
            {(Object.keys(attendanceLabels) as AttendanceStatus[]).map((value) => <button key={value} type="button" aria-pressed={attendance === value} onClick={() => changeAttendance(value)}>{attendanceLabels[value]}</button>)}
          </div>
        </div>
      </article>

      <aside className="dossier-side">
        <section className="evidence-sheet">
          <header><div><span>SOURCE EVIDENCE</span><h2>来源凭证</h2></div><strong>{event.sourcePostIds.length || 1}</strong></header>
          {sources.length ? <ol>{sources.map((source, index) => <li key={source.id}><span>{String(index + 1).padStart(2, "0")}</span><div><p>{source.text || "公开来源原文"}</p><a href={source.url} target="_blank" rel="noreferrer">{source.origin === "manual_x" ? "打开 X 原帖" : "打开公开来源"} <ArrowSquareOut size={15} /></a></div></li>)}</ol> : <p className="empty-evidence">来源 ID 已保留；本机没有对应帖子正文。</p>}
        </section>
        {event.changeHistory?.length ? <section className="change-history"><header><ArrowsClockwise size={18} /><div><span>CHANGE HISTORY</span><h2>活动变更记录</h2></div></header><ol>{[...event.changeHistory].reverse().map((record) => <li key={record.id}><time>{new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.changedAt))}</time>{record.changes.map((change) => <p key={`${record.id}-${change.field}`}><strong>{changeFieldLabel(change.field)}</strong><del>{change.before}</del><span>→</span><ins>{change.after}</ins></p>)}</li>)}</ol></section> : null}
        <section className="decision-launch">
          <StarFour size={23} weight="fill" />
          <div><h2>{event.countryCode === "KR" ? "判断我能不能去" : "旅行判断暂未开放"}</h2><p>{event.countryCode === "KR" ? "输入空闲时间后，按你的所在地、机场交通和风险偏好计算。" : "现阶段只对韩国线下活动启动旅行可行性判断。"}</p></div>
          {event.countryCode === "KR" && (event.status ?? "scheduled") === "scheduled" ? <Button tone="primary" onClick={() => onDecide(confirmedEventToArtistEvent(event, artist))}>开始判断</Button> : null}
        </section>
      </aside>
    </div>
  </section>;
}

function formatKoreaTime(value: string) { return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value)); }
function changeFieldLabel(field: string) { return ({ startsAt: "时间", venue: "场馆", city: "城市", eventType: "类型", status: "状态" } as Record<string, string>)[field] ?? field; }
