"use client";

import { AirplaneTilt, ArrowLeft, CalendarPlus, Check, MapPin, Sparkle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { CandidateFlight, FeasibilityResult } from "../lib/feasibility-engine";
import { nearbyEvents } from "../lib/mock-data";
import { loadLocalState, type SavedSpot } from "../lib/local-store";
import { buildKoreaTripPlan, createTripPlanIcs } from "../lib/trip-plan";
import type { ArtistEvent } from "../lib/types";
import { Button } from "./ui/Button";

interface Props {
  event: ArtistEvent;
  flight: CandidateFlight;
  feasibility: FeasibilityResult;
  assumedReturnHomeAt: string;
  onBack: () => void;
}

export function TripPlanView({ event, flight, feasibility, assumedReturnHomeAt, onBack }: Props) {
  const [lodging, setLodging] = useState("");
  const [includedNearby, setIncludedNearby] = useState<string[]>(nearbyEvents.filter((item) => item.fit === "on-route").map((item) => item.id));
  const [personalSpots, setPersonalSpots] = useState<SavedSpot[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setPersonalSpots(loadLocalState().spots.filter((spot) => spot.status === "visited-revisit" && spot.city.toLowerCase() === event.city.toLowerCase())), 0);
    return () => window.clearTimeout(timer);
  }, [event.city]);
  const days = useMemo(() => buildKoreaTripPlan({ event, flight, venueArrivalAt: feasibility.venueArrivalAt, immigrationMinutes: feasibility.assumptions.immigrationMinutes, lodging, assumedReturnHomeAt, nearbyEvents, includeNearbyIds: includedNearby, personalSpots }), [assumedReturnHomeAt, event, feasibility, flight, includedNearby, lodging, personalSpots]);

  function downloadCalendar() {
    const blob = new Blob([createTripPlanIcs(days, `${event.artist} · ${event.title}`)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ticketclub-${event.id}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function formatTime(iso: string) {
    return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).format(new Date(iso));
  }

  return <section className="trip-plan-panel" aria-labelledby="trip-plan-title">
    <header className="trip-plan-heading"><button className="back-button" type="button" onClick={onBack} aria-label="返回判断结果"><ArrowLeft size={20} /></button><div><p>{event.artist} · {event.city}</p><h2 id="trip-plan-title">你的韩国追星旅行计划</h2></div><Button tone="primary" icon={<CalendarPlus size={18} />} onClick={downloadCalendar}>导入日历</Button></header>
    <div className="trip-plan-controls">
      <label><span><MapPin size={17} /> 韩国住宿地址</span><input value={lodging} onChange={(input) => setLodging(input.target.value)} placeholder="粘贴酒店或 Airbnb 地址" /></label>
      <fieldset><legend>旅行期间附近场次</legend>{nearbyEvents.map((nearby) => <label key={nearby.id}><input type="checkbox" aria-label={`加入附近场次：${nearby.title}`} checked={includedNearby.includes(nearby.id)} onChange={() => setIncludedNearby((current) => current.includes(nearby.id) ? current.filter((id) => id !== nearby.id) : [...current, nearby.id])} /><span><strong>{nearby.title}</strong><small>{nearby.startsAt} · {nearby.fit === "on-route" ? "可顺路" : "可能冲突"}</small></span></label>)}</fieldset>
    </div>
    <div className="trip-day-list">{days.map((day) => <article key={day.date} className="trip-day"><header><span>{day.label}</span><time>{day.date}</time></header><ol>{day.items.map((item) => <li key={item.id} className={`trip-item trip-item--${item.kind}`}><time>{formatTime(item.startAt)}</time><span className="trip-item-dot">{item.kind === "flight" ? <AirplaneTilt size={14} weight="fill" /> : item.kind === "event" ? <Sparkle size={14} weight="fill" /> : <Check size={13} weight="bold" />}</span><div><h3>{item.title}{item.optional ? <small>可选</small> : null}</h3><p>{item.location}</p><span>{item.note}</span></div></li>)}</ol></article>)}</div>
    <aside className="trip-plan-honesty"><strong>请在出发前再次核对</strong><p>航班、活动结束时间、交通耗时和附近场次可能变化。日历导出保存的是当前确认版本，不会自动同步第三方变更。</p></aside>
  </section>;
}
