"use client";

import { BellRinging, CaretDown, CaretLeft, CaretRight, CaretUp, Diamond, DotsThree, LinkSimple, Rss, ShieldCheck } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { loadLocalState, type ConfirmedImportedEvent, type SavedArtist } from "../lib/local-store";
import type { ArtistEvent } from "../lib/types";
import { AppNavigation } from "./AppNavigation";
import { Button } from "./ui/Button";
import { EventDecisionFlow } from "./EventDecisionFlow";
import { ArtistManager } from "./ArtistManager";
import { IntelligenceInbox } from "./IntelligenceInbox";
import { ConfirmedEventDetail } from "./ConfirmedEventDetail";
import { SpotLibrary } from "./SpotLibrary";
import { NotificationCenter } from "./NotificationCenter";
import { DeploymentSetup } from "./DeploymentSetup";
import { syncGithubAlerts } from "../lib/github-alerts";

export function TicketClubHome() {
  const [screen, setScreen] = useState<"home" | "decision" | "artists" | "inbox" | "confirmed-detail" | "spots" | "notifications" | "deployment">("home");
  const [pendingCount, setPendingCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [confirmedEvents, setConfirmedEvents] = useState<ConfirmedImportedEvent[]>([]);
  const [savedArtists, setSavedArtists] = useState<SavedArtist[]>([]);
  const [selectedConfirmedEvent, setSelectedConfirmedEvent] = useState<ConfirmedImportedEvent | null>(null);
  const [decisionEvent, setDecisionEvent] = useState<ArtistEvent | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [screen]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      const local = await syncGithubAlerts().catch(() => loadLocalState());
      if (!active) return;
      setPendingCount(local.importedPosts.filter((post) => (post.status ?? "pending") === "pending").length);
      setNotificationCount(local.notifications.filter((item) => !item.readAt).length);
      setConfirmedEvents([...local.confirmedImportedEvents].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setSavedArtists(local.artists);
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [screen]);

  function confirmedDate(event: ConfirmedImportedEvent) {
    const date = new Date(event.startsAt);
    return {
      month: new Intl.DateTimeFormat("en", { month: "short", timeZone: "Asia/Seoul" }).format(date).toUpperCase(),
      day: new Intl.DateTimeFormat("en", { day: "2-digit", timeZone: "Asia/Seoul" }).format(date),
      time: new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).format(date),
    };
  }

  function nudge(direction: "up" | "down") {
    const amount = Math.max(240, window.innerHeight * 0.55);
    window.scrollBy({ top: direction === "up" ? -amount : amount, behavior: "smooth" });
  }

  function switchMain(direction: "previous" | "next") {
    const destinations = ["home", "spots", "artists", "notifications"] as const;
    const current = destinations.indexOf(screen === "home" || screen === "spots" || screen === "artists" || screen === "notifications" ? screen : "home");
    const next = direction === "next" ? (current + 1) % destinations.length : (current - 1 + destinations.length) % destinations.length;
    setScreen(destinations[next]);
  }

  return (
    <main id="top" className="ticketclub-app pearl-player-stage">
      <section className="pearl-player" aria-label="TicketClub Pocket Player">
        <div className="pearl-player__topline" aria-hidden="true">
          <span className="player-screw" />
          <strong>TicketClub</strong>
          <small>POCKET PLAYER · 01</small>
          <span className="player-led" />
          <span className="player-me">ME</span>
        </div>

        <div className="pearl-player__screen">
          <AppNavigation activeItem={screen === "spots" ? "活点" : screen === "artists" || screen === "notifications" || screen === "deployment" ? "我的" : "活动"} onHome={() => setScreen("home")} onManageArtists={() => setScreen("artists")} onOpenInbox={() => setScreen("inbox")} onOpenNotifications={() => setScreen("notifications")} onOpenSpots={() => setScreen("spots")} inboxCount={pendingCount} notificationCount={notificationCount} />

      {screen === "decision" && decisionEvent ? <EventDecisionFlow event={decisionEvent} onBack={() => setScreen(selectedConfirmedEvent ? "confirmed-detail" : "home")} /> : null}
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
            <h1 id="page-title">下一场，正在读取</h1>
            <p>公开活动进入播放队列前，需要先完成来源确认。</p>
          </div>
          <p className="sync-status">
            <span /> {confirmedEvents.length ? `${confirmedEvents.length} 场已确认` : "暂无已确认活动"}
          </p>
        </header>

        {!confirmedEvents.length ? <section className="real-data-empty" aria-label="尚无真实活动">
          <div className="real-data-empty__ticket"><span>NO SIGNAL · WAITING FOR SOURCE</span><Rss size={38} weight="bold" /><h2>播放队列还是空的</h2><p>TicketClub 不使用虚构活动填充首页。添加真实来源并确认原文后，活动会出现在这里。</p></div>
          <div className="real-data-empty__actions"><Button tone="primary" icon={<LinkSimple size={17} />} onClick={() => setScreen("artists")}>管理真实来源</Button><Button tone="secondary" icon={<BellRinging size={17} />} onClick={() => setScreen("inbox")}>打开待确认收件箱</Button></div>
          <aside><ShieldCheck size={20} /><p><strong>播放规则</strong>：缺少来源链接、明确时间或用户确认的内容，不会加入活动队列。</p></aside>
        </section> : null}

        {confirmedEvents.length ? <section className="confirmed-section" aria-labelledby="confirmed-title">
          <header><div><h2 id="confirmed-title">EVENT QUEUE · 活动队列</h2><p>重复帖子已合并，点开一场活动查看来源和时间。</p></div><span>{confirmedEvents.length} TRACKS</span></header>
          <div className="confirmed-list">
            {confirmedEvents.map((event) => {
              const date = confirmedDate(event);
              const artist = savedArtists.find((item) => item.id === event.artistId);
              return <article key={event.id}>
                <button className="confirmed-event-open" type="button" onClick={() => { setSelectedConfirmedEvent(event); setScreen("confirmed-detail"); }} aria-label={`打开 ${event.title} 的活动详情`}>
                  <time><small>{date.month}</small><strong>{date.day}</strong></time>
                  <div><p>{artist?.name ?? "未知艺人"} · {event.eventType}</p><h3>{event.title}</h3><span>{event.status === "cancelled" ? "已取消" : event.status === "postponed" ? "已延期" : `${date.time} · ${event.venue} · ${event.city}`}</span></div>
                  <aside><strong>{event.sourcePostIds?.length || 1}</strong><span>条来源</span></aside>
                </button>
              </article>;
            })}
          </div>
        </section> : null}

          </section> : null}
        </div>

        <aside className="pearl-player__controls" aria-label="播放器实体控制键">
          <div className="control-wheel">
            <button type="button" className="control-wheel__up" aria-label="向上滚动" onClick={() => nudge("up")}><CaretUp weight="fill" /></button>
            <button type="button" className="control-wheel__left" aria-label="上一个主界面" onClick={() => switchMain("previous")}><CaretLeft weight="fill" /></button>
            <button type="button" className="control-wheel__center" aria-label="返回活动主页" onClick={() => setScreen("home")}><Diamond weight="fill" /></button>
            <button type="button" className="control-wheel__right" aria-label="下一个主界面" onClick={() => switchMain("next")}><CaretRight weight="fill" /></button>
            <button type="button" className="control-wheel__down" aria-label="向下滚动" onClick={() => nudge("down")}><CaretDown weight="fill" /></button>
          </div>
          <div className="context-controls">
            <span>返回</span><span>主操作</span><span>更多</span>
            <button type="button" aria-label="返回活动主页" onClick={() => setScreen("home")}><CaretLeft weight="bold" /></button>
            <button type="button" className="is-primary" aria-label="打开待确认情报" onClick={() => setScreen("inbox")}><Diamond weight="fill" /></button>
            <button type="button" aria-label="打开个人设置" onClick={() => setScreen("artists")}><DotsThree weight="bold" /></button>
          </div>
        </aside>
        <span className="player-screw player-screw--bl" aria-hidden="true" />
        <span className="player-screw player-screw--br" aria-hidden="true" />
      </section>
    </main>
  );
}
