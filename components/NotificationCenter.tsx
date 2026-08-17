"use client";

import { ArrowLeft, BellRinging, CalendarDots, Check, GearSix, WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { loadLocalState, markAllNotificationsRead, markNotificationRead, type SavedNotification } from "../lib/local-store";
import { Button } from "./ui/Button";

const labels = { new_event: "NEW DROP", changed_event: "TIME CHANGE", cancelled_event: "CANCELLED", source_failure: "SOURCE ALERT" } as const;

export function NotificationCenter({ onBack, onOpenSetup }: { onBack: () => void; onOpenSetup: () => void }) {
  const [notifications, setNotifications] = useState<SavedNotification[]>(() => loadLocalState().notifications);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const visible = unreadOnly ? notifications.filter((item) => !item.readAt) : notifications;
  const unread = notifications.filter((item) => !item.readAt).length;

  function readOne(id: string) { setNotifications(markNotificationRead(id).notifications); }
  function readAll() { setNotifications(markAllNotificationsRead().notifications); }

  return <section className="notification-center">
    <header className="notification-heading">
      <Button tone="quiet" icon={<ArrowLeft size={18} />} onClick={onBack}>返回</Button>
      <div><p>SIGNAL LOG</p><h1>通知中心</h1><span>只有新活动、改期、取消或连续失败才会打扰你。</span></div>
      <Button tone="secondary" icon={<GearSix size={17} />} onClick={onOpenSetup}>设置自动检查</Button>
    </header>

    <div className="notification-toolbar">
      <div role="group" aria-label="通知筛选">
        <button className={!unreadOnly ? "is-active" : ""} onClick={() => setUnreadOnly(false)}>全部</button>
        <button className={unreadOnly ? "is-active" : ""} onClick={() => setUnreadOnly(true)}>未读 {unread || ""}</button>
      </div>
      {unread ? <button type="button" onClick={readAll}><Check size={16} /> 全部已读</button> : null}
    </div>

    {visible.length ? <div className="notification-ledger">{visible.map((item) => <button key={item.id} type="button" className={item.readAt ? "is-read" : ""} onClick={() => readOne(item.id)}>
      <span className={`notification-icon notification-icon--${item.kind}`}>{item.kind === "source_failure" ? <WarningCircle size={21} /> : <CalendarDots size={21} />}</span>
      <span><small>{labels[item.kind]} · {new Date(item.createdAt).toLocaleString("zh-CN")}</small><strong>{item.title}</strong><em>{item.body}</em></span>
      {!item.readAt ? <i aria-label="未读" /> : null}
    </button>)}</div> : <div className="notification-empty"><BellRinging size={40} weight="duotone" /><h2>{unreadOnly ? "没有未读通知" : "现在很安静"}</h2><p>无更新时 TicketClub 不发送通知。定时检查结果会通过你配置的邮件送达。</p></div>}

    <aside className="notification-boundary"><strong>自动检查如何运行？</strong><p>网页内通知保存在本机浏览器；GitHub Actions 在云端读取仓库的订阅配置并发送邮件，两者不会伪装成已经云同步。</p></aside>
  </section>;
}
