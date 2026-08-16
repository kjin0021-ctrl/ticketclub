"use client";

import { BellRinging, LinkSimple, Rss, ShieldCheck } from "@phosphor-icons/react";
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

  return (
    <main id="top" className="ticketclub-app">
      <AppNavigation onHome={() => setScreen("home")} onManageArtists={() => setScreen("artists")} onOpenInbox={() => setScreen("inbox")} onOpenNotifications={() => setScreen("notifications")} onOpenSpots={() => setScreen("spots")} inboxCount={pendingCount} notificationCount={notificationCount} />

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
            <h1 id="page-title">等待下一张真实票根</h1>
            <p>只有经过来源确认的公开活动才会出现在这里。</p>
          </div>
          <p className="sync-status">
            <span /> {confirmedEvents.length ? `${confirmedEvents.length} 场已确认` : "暂无已确认活动"}
          </p>
        </header>

        {!confirmedEvents.length ? <section className="real-data-empty" aria-label="尚无真实活动">
          <div className="real-data-empty__ticket"><span>LIVE SOURCE</span><Rss size={42} weight="duotone" /><h2>还没有确认过的真实活动</h2><p>TicketClub 不再用演示活动填充首页。公开来源发生变化后，请核对原文并确认，活动才会进入这里。</p></div>
          <div className="real-data-empty__actions"><Button tone="primary" icon={<LinkSimple size={17} />} onClick={() => setScreen("artists")}>管理真实来源</Button><Button tone="secondary" icon={<BellRinging size={17} />} onClick={() => setScreen("inbox")}>打开待确认收件箱</Button></div>
          <aside><ShieldCheck size={20} /><p><strong>真实性规则</strong>：没有来源链接、明确时间和用户确认的内容，不会被显示成艺人行程。</p></aside>
        </section> : null}

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

      </section> : null}
    </main>
  );
}
