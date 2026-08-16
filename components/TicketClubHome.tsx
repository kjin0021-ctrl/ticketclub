"use client";

import { ArrowSquareOut, PaperPlaneTilt, StarFour } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { feasibility, featuredEvent, nearbyEvents } from "../lib/mock-data";
import { loadLocalState, saveAttendance, type ConfirmedImportedEvent, type SavedArtist } from "../lib/local-store";
import type { AttendanceStatus } from "../lib/types";
import type { ArtistEvent } from "../lib/types";
import { AppNavigation } from "./AppNavigation";
import { ArtistPolaroid } from "./ArtistPolaroid";
import { TicketCard } from "./TicketCard";
import { Button } from "./ui/Button";
import { EventDecisionFlow } from "./EventDecisionFlow";
import { ArtistManager } from "./ArtistManager";
import { IntelligenceInbox } from "./IntelligenceInbox";
import { ConfirmedEventDetail } from "./ConfirmedEventDetail";
import { SpotLibrary } from "./SpotLibrary";
import { NotificationCenter } from "./NotificationCenter";
import { DeploymentSetup } from "./DeploymentSetup";

const statusLabels: Record<AttendanceStatus, string> = {
  going: "去",
  considering: "考虑",
  "not-going": "不去",
};

export function TicketClubHome() {
  const [status, setStatus] = useState<AttendanceStatus>("considering");
  const [screen, setScreen] = useState<"home" | "decision" | "artists" | "inbox" | "confirmed-detail" | "spots" | "notifications" | "deployment">("home");
  const [pendingCount, setPendingCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [confirmedEvents, setConfirmedEvents] = useState<ConfirmedImportedEvent[]>([]);
  const [savedArtists, setSavedArtists] = useState<SavedArtist[]>([]);
  const [selectedConfirmedEvent, setSelectedConfirmedEvent] = useState<ConfirmedImportedEvent | null>(null);
  const [decisionEvent, setDecisionEvent] = useState<ArtistEvent>(featuredEvent);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedStatus = loadLocalState().attendanceByEvent[featuredEvent.id];
      if (savedStatus) setStatus(savedStatus);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const local = loadLocalState();
      setPendingCount(local.importedPosts.filter((post) => (post.status ?? "pending") === "pending").length);
      setNotificationCount(local.notifications.filter((item) => !item.readAt).length);
      setConfirmedEvents([...local.confirmedImportedEvents].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setSavedArtists(local.artists);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [screen]);

  function changeAttendance(nextStatus: AttendanceStatus) {
    setStatus(nextStatus);
    saveAttendance(featuredEvent.id, nextStatus);
  }

  function confirmedDate(event: ConfirmedImportedEvent) {
    const date = new Date(event.startsAt);
    return {
      month: new Intl.DateTimeFormat("en", { month: "short", timeZone: "Asia/Seoul" }).format(date).toUpperCase(),
      day: new Intl.DateTimeFormat("en", { day: "2-digit", timeZone: "Asia/Seoul" }).format(date),
      time: new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).format(date),
    };
  }

  return (
    <main id="top" className="ticketclub-app">
      <AppNavigation onHome={() => setScreen("home")} onManageArtists={() => setScreen("artists")} onOpenInbox={() => setScreen("inbox")} onOpenNotifications={() => setScreen("notifications")} onOpenSpots={() => setScreen("spots")} inboxCount={pendingCount} notificationCount={notificationCount} />

      {screen === "decision" ? <EventDecisionFlow event={decisionEvent} onBack={() => setScreen(selectedConfirmedEvent ? "confirmed-detail" : "home")} /> : null}
      {screen === "artists" ? <ArtistManager onBack={() => setScreen("home")} /> : null}
      {screen === "inbox" ? <IntelligenceInbox onBack={() => setScreen("home")} /> : null}
      {screen === "spots" ? <SpotLibrary onBack={() => setScreen("home")} /> : null}
      {screen === "notifications" ? <NotificationCenter onBack={() => setScreen("home")} onOpenSetup={() => setScreen("deployment")} /> : null}
      {screen === "deployment" ? <DeploymentSetup onBack={() => setScreen("notifications")} /> : null}
      {screen === "confirmed-detail" && selectedConfirmedEvent ? <ConfirmedEventDetail
        event={selectedConfirmedEvent}
        artist={savedArtists.find((artist) => artist.id === selectedConfirmedEvent.artistId)}
        onBack={() => setScreen("home")}
        onDecide={(event) => { setDecisionEvent(event); setScreen("decision"); }}
      /> : null}

      {screen === "home" ? <section className="departure-desk" aria-labelledby="page-title">
        <header className="page-heading">
          <div>
            <p className="page-heading__overline">MY STAR DEPARTURE DESK</p>
            <h1 id="page-title">下午好，下一站是首尔</h1>
            <p>韩国行程优先；其他国家活动按时间排列。</p>
          </div>
          <p className="sync-status">
            <span /> 已在 12:00 同步
          </p>
        </header>

        <div className="desk-layout">
          <section className="ticket-board" aria-label="最近的艺人行程">
            <span className="board-label">NEXT DEPARTURE</span>
            <ArtistPolaroid />
            <TicketCard event={featuredEvent} feasibility={feasibility} />

            <div className="ticket-actions">
              <Button tone="primary" icon={<StarFour size={17} weight="fill" />} onClick={() => { setSelectedConfirmedEvent(null); setDecisionEvent(featuredEvent); setScreen("decision"); }}>
                判断能否去
              </Button>
              <Button tone="secondary" icon={<ArrowSquareOut size={17} />}>
                查看原帖
              </Button>

              <div className="attendance-control" aria-label="参加状态">
                {(Object.keys(statusLabels) as AttendanceStatus[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={status === value}
                    onClick={() => changeAttendance(value)}
                  >
                    {statusLabels[value]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <aside className="decision-sidebar">
            <section className="decision-card">
              <header>
                <h2>可行性速览</h2>
                <span>STANDARD</span>
              </header>
              <strong className="travel-duration">14h 35m</strong>
              <p>{feasibility.route.join(" → ")}</p>
              <p>包含入境预留 120 分钟</p>
              <span className="success-tag">余量 3h 10m</span>
            </section>

            <section className="memo-note">
              <h2>Today&apos;s memo</h2>
              <p>建议周五晚出发。抵达后先去酒店寄存行李，再前往场馆。</p>
            </section>

            <section className="nearby-section" aria-labelledby="nearby-title">
              <header>
                <h2 id="nearby-title">旅行期间附近场次</h2>
                <span>08.28—08.31 · SEOUL</span>
              </header>
              <div className="nearby-list">
                {nearbyEvents.map((event) => (
                  <article key={event.id} className={`nearby-event nearby-event--${event.fit}`}>
                    <time>{event.startsAt}</time>
                    <h3>{event.title}</h3>
                    <p>
                      {event.distanceKm} km · {event.fit === "on-route" ? "可顺路" : "时间冲突"}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>

        {confirmedEvents.length ? <section className="confirmed-section" aria-labelledby="confirmed-title">
          <header><div><h2 id="confirmed-title">刚确认的艺人行程</h2><p>来自收件箱，重复帖子已经合并为来源证据。</p></div><span>{confirmedEvents.length} 场</span></header>
          <div className="confirmed-list">
            {confirmedEvents.map((event) => {
              const date = confirmedDate(event);
              const artist = savedArtists.find((item) => item.id === event.artistId);
              return <article key={event.id}>
                <button className="confirmed-event-open" type="button" onClick={() => { setSelectedConfirmedEvent(event); setScreen("confirmed-detail"); }} aria-label={`打开 ${event.title} 的活动详情`}>
                  <time><small>{date.month}</small><strong>{date.day}</strong></time>
                  <div><p>{artist?.name ?? "未知艺人"} · {event.eventType}</p><h3>{event.title}</h3><span>{date.time} · {event.venue} · {event.city}</span></div>
                  <aside><strong>{event.sourcePostIds?.length || 1}</strong><span>条来源</span></aside>
                </button>
              </article>;
            })}
          </div>
        </section> : null}

        <section className="upcoming-section" aria-labelledby="upcoming-title">
          <header>
            <h2 id="upcoming-title">Upcoming tickets</h2>
            <button type="button">
              查看全部 <PaperPlaneTilt size={16} />
            </button>
          </header>
          <div className="upcoming-list">
            {[
              ["SEP", "04", "Music Bank", "Seoul · 直播录制"],
              ["SEP", "12", "Dream Festival", "Busan · 拼盘演出"],
              ["OCT", "03", "Fan Signing", "Seoul · 可能是行程"],
            ].map(([month, day, title, detail]) => (
              <article key={`${month}-${day}`}>
                <time><small>{month}</small><strong>{day}</strong></time>
                <div><h3>{title}</h3><p>{detail}</p></div>
              </article>
            ))}
          </div>
        </section>
      </section> : null}
    </main>
  );
}
