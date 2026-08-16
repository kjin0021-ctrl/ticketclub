"use client";

import { ArrowLeft, ArrowSquareOut, CalendarBlank, Clock, MapPin, ShieldCheck, StarFour } from "@phosphor-icons/react";
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
        <div className="dossier-ticket__band"><span>LIVE TICKET</span><strong>{event.countryCode === "KR" ? "SEOUL FILE" : "WORLD FILE"}</strong></div>
        <div className="dossier-ticket__body">
          <p>{artist?.name ?? "未知艺人"} · {event.eventType}</p>
          <h2>{event.title}</h2>
          <dl>
            <div><dt><CalendarBlank size={17} /> 日期与时间</dt><dd>{date}</dd></div>
            <div><dt><MapPin size={17} /> 场馆</dt><dd>{event.venue}<small>{event.city} · {event.countryCode}</small></dd></div>
            <div><dt><Clock size={17} /> 判断基准</dt><dd>正式开始时间<small>尚未提供彩排、集合或签到时间</small></dd></div>
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
          {sources.length ? <ol>{sources.map((source, index) => <li key={source.id}><span>{String(index + 1).padStart(2, "0")}</span><div><p>{source.text || "X 帖子原文"}</p><a href={source.url} target="_blank" rel="noreferrer">打开 X 原帖 <ArrowSquareOut size={15} /></a></div></li>)}</ol> : <p className="empty-evidence">来源 ID 已保留；本机没有对应帖子正文。</p>}
        </section>
        <section className="decision-launch">
          <StarFour size={23} weight="fill" />
          <div><h2>{event.countryCode === "KR" ? "判断我能不能去" : "旅行判断暂未开放"}</h2><p>{event.countryCode === "KR" ? "输入空闲时间后，按你的所在地、机场交通和风险偏好计算。" : "现阶段只对韩国线下活动启动旅行可行性判断。"}</p></div>
          {event.countryCode === "KR" ? <Button tone="primary" onClick={() => onDecide(confirmedEventToArtistEvent(event, artist))}>开始判断</Button> : null}
        </section>
      </aside>
    </div>
  </section>;
}
