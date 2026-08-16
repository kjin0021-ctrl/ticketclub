"use client";

import {
  AirplaneTilt,
  ArrowSquareOut,
  ArrowLeft,
  CalendarBlank,
  Check,
  Clock,
  Copy,
  FileImage,
  MapPin,
  MagnifyingGlass,
  SlidersHorizontal,
  ShieldCheck,
  SpinnerGap,
  Sparkle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { ArtistEvent } from "../lib/types";
import { calculateFeasibility, defaultTimeAssumptions, type RiskMode, type TimeAssumptions } from "../lib/feasibility-engine";
import { createLocalEstimate, createManualFlight, isValidFlightNumber, offlineFlightAdapter, type FlightCandidate, type FlightInputMode, type FlightLookupResult } from "../lib/flight-adapters";
import { buildFlightSearchLinks, parseFlightSearchText } from "../lib/flight-import";
import { loadLocalState, saveAvailability, saveDecisionDraft, saveFeasibilityRun, saveTimeAssumptions } from "../lib/local-store";
import { Button } from "./ui/Button";
import { TripPlanView } from "./TripPlanView";

type DecisionStep = "event" | "availability" | "confirm" | "result" | "plan";

const steps: Array<{ id: DecisionStep; label: string }> = [
  { id: "event", label: "活动" },
  { id: "availability", label: "空闲时间" },
  { id: "confirm", label: "确认" },
  { id: "result", label: "判断" },
  { id: "plan", label: "计划" },
];

const sampleAvailability = "8月28日周五下班后有空，最早晚上7点离开墨尔本。9月1日上午需要回到家。";

interface EventDecisionFlowProps {
  onBack: () => void;
  event?: ArtistEvent;
}

function dateKey(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shiftDateKey(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function EventDecisionFlow({ onBack, event }: EventDecisionFlowProps) {
  const eventDay = dateKey(event.startsAt);
  const outboundDay = shiftDateKey(eventDay, -1);
  const returnDay = shiftDateKey(eventDay, 3);
  const [step, setStep] = useState<DecisionStep>("event");
  const [availabilityText, setAvailabilityText] = useState("");
  const [fileName, setFileName] = useState("");
  const [origin, setOrigin] = useState("Melbourne CBD");
  const [availableFrom, setAvailableFrom] = useState(`${outboundDay}T19:00`);
  const [mustReturnBy, setMustReturnBy] = useState(`${returnDay}T09:00`);
  const [risk, setRisk] = useState<RiskMode>("standard");
  const [flightMode, setFlightMode] = useState<FlightInputMode>("recommended");
  const [flightNumber, setFlightNumber] = useState("");
  const [flightLookup, setFlightLookup] = useState<FlightLookupResult | null>(null);
  const [flightDepartureAt, setFlightDepartureAt] = useState(`${outboundDay}T22:40`);
  const [flightArrivalAt, setFlightArrivalAt] = useState(`${eventDay}T09:15`);
  const [flightStops, setFlightStops] = useState(0);
  const [originAirport, setOriginAirport] = useState("MEL");
  const [destinationAirport, setDestinationAirport] = useState("ICN");
  const [assumedReturnHomeAt, setAssumedReturnHomeAt] = useState(`${returnDay}T06:00`);
  const [remoteFlights, setRemoteFlights] = useState<FlightCandidate[]>([]);
  const [selectedRemoteFlight, setSelectedRemoteFlight] = useState<FlightCandidate | null>(null);
  const [flightSearchState, setFlightSearchState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [flightSearchMessage, setFlightSearchMessage] = useState("");
  const [flightImportText, setFlightImportText] = useState("");
  const [flightImportMessage, setFlightImportMessage] = useState("");
  const [ocrState, setOcrState] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [flightScreenshotName, setFlightScreenshotName] = useState("");
  const [timeAssumptions, setTimeAssumptions] = useState<TimeAssumptions>(defaultTimeAssumptions);
  const [assumptionsSaved, setAssumptionsSaved] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const currentIndex = steps.findIndex((item) => item.id === step);
  const canRecognize = availabilityText.trim().length > 8 || Boolean(fileName);
  const flightReady = flightMode !== "flight-number" || isValidFlightNumber(flightNumber);
  const eventDate = useMemo(
    () => new Intl.DateTimeFormat("zh-CN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(event.startsAt)),
    [event.startsAt],
  );
  const searchLinks = useMemo(() => buildFlightSearchLinks(originAirport, destinationAirport, outboundDay), [destinationAirport, originAirport, outboundDay]);
  const selectedFlight = useMemo(() => flightMode === "recommended"
    ? selectedRemoteFlight ?? createLocalEstimate({ departureDate: outboundDay, arrivalDate: eventDay, originAirport, destinationAirport })
    : createManualFlight({
      flightNumber,
      departureAt: `${flightDepartureAt}:00+10:00`,
      arrivalAt: `${flightArrivalAt}:00+09:00`,
      stops: flightStops,
      originAirport,
      destinationAirport,
    }), [destinationAirport, eventDay, flightArrivalAt, flightDepartureAt, flightMode, flightNumber, flightStops, originAirport, outboundDay, selectedRemoteFlight]);
  const calculation = useMemo(() => calculateFeasibility({
    availableFrom: `${availableFrom}:00+10:00`,
    mustReturnBy: `${mustReturnBy}:00+10:00`,
    eventStartsAt: event.startsAt,
    eventCheckInAt: event.checkInAt,
    riskMode: risk,
    outboundFlight: selectedFlight,
    assumedReturnHomeAt: `${assumedReturnHomeAt}:00+10:00`,
    assumptions: timeAssumptions,
  }), [assumedReturnHomeAt, availableFrom, event.checkInAt, event.startsAt, mustReturnBy, risk, selectedFlight, timeAssumptions]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const local = loadLocalState();
      const draft = local.decisionDrafts[event.id];
      setTimeAssumptions(draft?.timeAssumptions ?? local.timeAssumptions);
      if (draft) {
        setAvailabilityText(draft.availabilityText);
        setFileName(draft.screenshotName);
        setOrigin(draft.origin);
        setAvailableFrom(draft.availableFrom);
        setMustReturnBy(draft.mustReturnBy);
        setRisk(draft.riskMode);
        setFlightMode(draft.flightInputMode ?? "recommended");
        setFlightNumber(draft.flightNumber ?? "");
        setFlightDepartureAt(draft.flightDepartureAt ?? `${outboundDay}T22:40`);
        setFlightArrivalAt(draft.flightArrivalAt ?? `${eventDay}T09:15`);
        setFlightStops(draft.flightStops ?? 0);
        setOriginAirport(draft.originAirport ?? "MEL");
        setDestinationAirport(draft.destinationAirport ?? "ICN");
        setAssumedReturnHomeAt(draft.assumedReturnHomeAt ?? `${returnDay}T06:00`);
        setSavedAt(draft.updatedAt);
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [event.id, eventDay, outboundDay, returnDay]);

  useEffect(() => {
    if (!storageReady) return;
    const timer = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      saveDecisionDraft({
        eventId: event.id,
        availabilityText,
        screenshotName: fileName,
        origin,
        availableFrom,
        mustReturnBy,
        riskMode: risk,
        flightInputMode: flightMode,
        flightNumber,
        flightDepartureAt,
        flightArrivalAt,
        flightStops,
        originAirport,
        destinationAirport,
        assumedReturnHomeAt,
        timeAssumptions,
        updatedAt,
      });
      setSavedAt(updatedAt);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [assumedReturnHomeAt, availabilityText, availableFrom, destinationAirport, event.id, fileName, flightArrivalAt, flightDepartureAt, flightMode, flightNumber, flightStops, mustReturnBy, origin, originAirport, risk, storageReady, timeAssumptions]);

  function updateAssumption(key: keyof Omit<TimeAssumptions, "venueArrivalLeadMinutes">, value: number) {
    setTimeAssumptions((current) => ({ ...current, [key]: Math.max(0, value) }));
    setAssumptionsSaved(false);
  }

  function updateRiskLead(mode: RiskMode, value: number) {
    setTimeAssumptions((current) => ({ ...current, venueArrivalLeadMinutes: { ...current.venueArrivalLeadMinutes, [mode]: Math.max(0, value) } }));
    setAssumptionsSaved(false);
  }

  function saveAssumptionsAsDefault() {
    saveTimeAssumptions(timeAssumptions);
    setAssumptionsSaved(true);
  }

  async function lookUpFlightNumber() {
    const result = await offlineFlightAdapter.lookup(flightNumber, outboundDay);
    setFlightLookup(result);
    if (result.normalizedFlightNumber) setFlightNumber(result.normalizedFlightNumber);
  }

  async function searchRealFlights() {
    setFlightSearchState("loading");
    setFlightSearchMessage("");
    try {
      const query = new URLSearchParams({ origin: originAirport, destination: destinationAirport, date: outboundDay });
      const response = await fetch(`/api/flights/search?${query}`);
      const payload = await response.json() as { candidates?: FlightCandidate[]; error?: string; configured?: boolean };
      if (!response.ok) throw new Error(payload.error ?? "航班查询失败");
      const candidates = payload.candidates ?? [];
      setRemoteFlights(candidates);
      setSelectedRemoteFlight(candidates[0] ?? null);
      setFlightSearchState("ready");
      setFlightSearchMessage(candidates.length ? `找到 ${candidates.length} 个测试环境候选，请以航司页面复核。` : "测试环境没有返回这条航线，可继续使用本地估算。近未来日期通常更容易有结果。");
    } catch (error) {
      setRemoteFlights([]);
      setSelectedRemoteFlight(null);
      setFlightSearchState("error");
      setFlightSearchMessage(error instanceof Error ? error.message : "航班查询失败");
    }
  }

  function flightTime(iso: string, timeZone: string) {
    return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(new Date(iso)).replace("/", ".");
  }

  function applyFlightImport(text = flightImportText) {
    const parsed = parseFlightSearchText(text, { origin: originAirport, destination: destinationAirport, departureDate: outboundDay });
    if (!parsed.candidate) {
      setFlightImportMessage(`还缺少：${parsed.missing.join("、")}。可修改识别文字后重试。`);
      return;
    }
    setSelectedRemoteFlight(parsed.candidate);
    setFlightImportMessage(`已识别 ${parsed.candidate.flightNumber}，请核对下方蓝色航班票。`);
  }

  async function recognizeFlightScreenshot(file?: File) {
    if (!file) return;
    setFlightScreenshotName(file.name);
    setOcrState("reading");
    setOcrProgress(0);
    setFlightImportMessage("");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, { logger: (message) => {
        if (message.status === "recognizing text") setOcrProgress(Math.round((message.progress ?? 0) * 100));
      } });
      try {
        const result = await worker.recognize(file, { rotateAuto: true });
        setFlightImportText(result.data.text.trim());
        setOcrState("done");
        applyFlightImport(result.data.text);
      } finally {
        await worker.terminate();
      }
    } catch {
      setOcrState("error");
      setFlightImportMessage("本地 OCR 未能启动。图片不会上传，你仍可以从搜索页复制文字后粘贴。 ");
    }
  }

  function formatTimelineTime(iso: string, id: string) {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: id === "leave-home" || id === "flight" ? "Australia/Melbourne" : "Asia/Seoul",
    }).format(new Date(iso)).replace("/", ".");
  }

  function recognizeAvailability() {
    if (!canRecognize) return;
    setStep("confirm");
  }

  function calculateAndSave() {
    const availabilityId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    saveAvailability({
      id: availabilityId,
      rawInput: availabilityText,
      inputMethod: fileName ? "screenshot" : availabilityText ? "text" : "manual",
      screenshotName: fileName || undefined,
      originLabel: origin,
      availableFrom: `${availableFrom}:00+10:00`,
      availableUntil: `${mustReturnBy}:00+10:00`,
      confirmedAt: createdAt,
    });
    saveFeasibilityRun({
      id: crypto.randomUUID(),
      eventId: event.id,
      availabilityId,
      riskMode: risk,
      result: calculation,
      createdAt,
    });
    setSavedAt(createdAt);
    setStep("result");
  }

  return (
    <section className="decision-flow" aria-labelledby="decision-title">
      <header className="flow-topbar">
        <button className="back-button" type="button" onClick={onBack} aria-label="返回行程首页">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p>TRIP FEASIBILITY DESK</p>
          <h1 id="decision-title">这次，去得了吗？</h1>
        </div>
        <span className="flow-save-state"><Check size={14} weight="bold" /> {savedAt ? "已保存到本机" : "正在准备存储"}</span>
      </header>

      <ol className="flow-progress" aria-label="判断进度">
        {steps.map((item, index) => (
          <li key={item.id} className={index <= currentIndex ? "is-active" : ""} aria-current={item.id === step ? "step" : undefined}>
            <span>{index < currentIndex ? <Check size={13} weight="bold" /> : index + 1}</span>
            <strong>{item.label}</strong>
          </li>
        ))}
      </ol>

      <div className="flow-layout">
        <div className="flow-workspace">
          {step === "event" ? (
            <section className="flow-panel flow-event-panel">
              <div className="panel-kicker"><Sparkle size={16} weight="fill" /> 官方行程</div>
              <p className="flow-artist">{event.artist} · {event.type}</p>
              <h2>{event.title}</h2>
              <dl className="event-detail-grid">
                <div><dt><CalendarBlank size={17} /> 日期</dt><dd>{eventDate}</dd></div>
                <div><dt><MapPin size={17} /> 场馆</dt><dd>{event.venue}<small>{event.city}, {event.country}</small></dd></div>
                <div><dt><Clock size={17} /> 判断基准</dt><dd>{event.checkInAt ? "签到 / 集合时间" : "正式开始时间"}<small>{event.checkInAt ? "标准模式提前 2 小时到达" : "未提供彩排、集合或签到时间"}</small></dd></div>
                <div><dt><ShieldCheck size={17} /> 信息来源</dt><dd>{event.sourceLabel}<small>已确认 · 原帖可追溯</small></dd></div>
              </dl>
              <div className="source-preview">
                <span>ORIGINAL POST · X</span>
                <p>活动来自 {event.sourceLabel}，原帖内容与来源链接已保存在活动详情中。</p>
              </div>
              <footer className="flow-panel-actions">
                <p>活动信息有误？之后可在确认页修改。</p>
                <Button tone="primary" onClick={() => setStep("availability")}>填写我的空闲时间</Button>
              </footer>
            </section>
          ) : null}

          {step === "availability" ? (
            <section className="flow-panel availability-panel">
              <div className="panel-kicker"><Clock size={16} /> 不连接日历</div>
              <h2>告诉票来，你什么时候有空</h2>
              <p className="panel-intro">像发消息一样描述即可，也可以上传日历截图。识别后你仍能逐项确认。</p>
              <label className="availability-input">
                <span>粘贴或输入空闲时间</span>
                <textarea
                  value={availabilityText}
                  onChange={(event) => setAvailabilityText(event.target.value)}
                  placeholder={sampleAvailability}
                  rows={6}
                />
              </label>
              <div className="input-divider"><span>或者</span></div>
              <label className="screenshot-dropzone">
                <FileImage size={28} />
                <strong>{fileName || "上传日历或聊天截图"}</strong>
                <span>{fileName ? "图片已收到，下一步可确认识别结果" : "PNG、JPG，单张不超过 10 MB"}</span>
                <input type="file" accept="image/png,image/jpeg" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
              </label>
              <button className="sample-button" type="button" onClick={() => setAvailabilityText(sampleAvailability)}>使用演示文字</button>
              <footer className="flow-panel-actions">
                <Button tone="secondary" onClick={() => setStep("event")}>上一步</Button>
                <Button tone="primary" disabled={!canRecognize} onClick={recognizeAvailability} icon={<Sparkle size={16} weight="fill" />}>识别空闲时间</Button>
              </footer>
            </section>
          ) : null}

          {step === "confirm" ? (
            <section className="flow-panel confirm-panel">
              <div className="panel-kicker"><Check size={16} weight="bold" /> 待你确认</div>
              <h2>我们这样理解你的时间</h2>
              <p className="panel-intro">以下字段会直接影响能否赶上，请确认后再计算。</p>
              <div className="confirm-form">
                <label><span>从哪里出发</span><input value={origin} onChange={(event) => setOrigin(event.target.value)} /></label>
                <label><span>最早可以出发</span><input type="datetime-local" value={availableFrom} onChange={(event) => setAvailableFrom(event.target.value)} /></label>
                <label><span>最晚需要回家</span><input type="datetime-local" value={mustReturnBy} onChange={(event) => setMustReturnBy(event.target.value)} /></label>
              </div>
              <details className="assumption-editor">
                <summary><span><SlidersHorizontal size={18} /> 时间假设</span><strong>{timeAssumptions.homeToAirportMinutes + timeAssumptions.airportAdvanceMinutes} 分钟到起飞</strong></summary>
                <p>这些时间直接影响结论。本次修改会自动保存到活动草稿；只有点击按钮才会成为以后活动的默认值。</p>
                <div className="assumption-fields">
                  <label><span>家到机场</span><div><input type="number" min="0" max="360" value={timeAssumptions.homeToAirportMinutes} onChange={(input) => updateAssumption("homeToAirportMinutes", Number(input.target.value))} /><small>分钟</small></div></label>
                  <label><span>提前到机场</span><div><input type="number" min="0" max="480" value={timeAssumptions.airportAdvanceMinutes} onChange={(input) => updateAssumption("airportAdvanceMinutes", Number(input.target.value))} /><small>分钟</small></div></label>
                  <label><span>入境与取行李</span><div><input type="number" min="0" max="360" value={timeAssumptions.immigrationMinutes} onChange={(input) => updateAssumption("immigrationMinutes", Number(input.target.value))} /><small>分钟</small></div></label>
                  <label><span>机场到场馆</span><div><input type="number" min="0" max="360" value={timeAssumptions.arrivalAirportToVenueMinutes} onChange={(input) => updateAssumption("arrivalAirportToVenueMinutes", Number(input.target.value))} /><small>分钟</small></div></label>
                </div>
                <div className="risk-lead-fields">
                  <span>到场提前量</span>
                  {([ ["relaxed", "悠闲"], ["standard", "标准"], ["extreme", "极限"] ] as Array<[RiskMode, string]>).map(([mode, label]) => <label key={mode}><span>{label}</span><input type="number" min="0" max="720" value={timeAssumptions.venueArrivalLeadMinutes[mode]} onChange={(input) => updateRiskLead(mode, Number(input.target.value))} /><small>分钟</small></label>)}
                </div>
                <footer><button type="button" onClick={() => { setTimeAssumptions(defaultTimeAssumptions); setAssumptionsSaved(false); }}>恢复系统默认</button><button type="button" className="save-assumptions" onClick={saveAssumptionsAsDefault}>{assumptionsSaved ? "已保存为默认值" : "保存为我的默认值"}</button></footer>
              </details>
              <fieldset className="risk-options">
                <legend>你的赶路偏好</legend>
                {[
                  ["relaxed", "悠闲", `基准前 ${timeAssumptions.venueArrivalLeadMinutes.relaxed} 分钟到场`],
                  ["standard", "标准", `基准前 ${timeAssumptions.venueArrivalLeadMinutes.standard} 分钟到场`],
                  ["extreme", "极限", `基准前 ${timeAssumptions.venueArrivalLeadMinutes.extreme} 分钟到场`],
                ].map(([value, label, note]) => (
                  <label key={value} className={risk === value ? "is-selected" : ""}>
                    <input type="radio" name="risk" value={value} checked={risk === value} onChange={() => setRisk(value as RiskMode)} />
                    <strong>{label}</strong><span>{note}</span>
                  </label>
                ))}
              </fieldset>
              <section className="flight-planner" aria-labelledby="flight-planner-title">
                <header><div><h3 id="flight-planner-title">选择用于判断的航班</h3><p>票来只计算时间，不代替航司确认座位与实时变动。</p></div><span>{selectedFlight.sourceLabel}</span></header>
                <div className="flight-mode-control" aria-label="航班输入方式">
                  {([ ["recommended", "推荐估算"], ["flight-number", "输入航班号"], ["manual", "手动填写"] ] as Array<[FlightInputMode, string]>).map(([value, label]) => <button type="button" key={value} aria-pressed={flightMode === value} onClick={() => { setFlightMode(value); setFlightLookup(null); }}>{label}</button>)}
                </div>

                {flightMode === "recommended" ? <div className="flight-candidate flight-candidate--selected">
                  <div><span>{selectedRemoteFlight ? "AMADEUS TEST OFFER" : "LOCAL ESTIMATE"}</span><strong>{selectedFlight.originAirport} → {selectedFlight.destinationAirport}</strong><p>{selectedRemoteFlight ? `${flightTime(selectedFlight.departureAt, "Australia/Melbourne")} 起飞 · ${flightTime(selectedFlight.arrivalAt, "Asia/Seoul")} 抵达` : "22:40 起飞 · 次日 09:15 抵达 · 直飞估算"}</p></div>
                  <em>{selectedRemoteFlight ? selectedFlight.flightNumber : "非实时"}</em>
                </div> : null}

                {flightMode === "recommended" ? <section className="flight-browser-import" aria-labelledby="flight-import-title">
                  <header><div><h4 id="flight-import-title">从航班搜索导入</h4><p>搜索发生在你的浏览器；票来只读取你粘贴的文字或上传的截图。</p></div><span>ZERO API KEY</span></header>
                  <div className="flight-search-links">
                    <a href={searchLinks.googleFlights} target="_blank" rel="noreferrer">打开 Google Flights <ArrowSquareOut size={16} /></a>
                    <a href={searchLinks.skyscanner} target="_blank" rel="noreferrer">打开 Skyscanner <ArrowSquareOut size={16} /></a>
                  </div>
                  <label className="flight-import-copy"><span><Copy size={16} /> 粘贴一条航班结果</span><textarea rows={4} value={flightImportText} onChange={(input) => { setFlightImportText(input.target.value); setFlightImportMessage(""); }} placeholder={"KE 402\nMEL 22:40 → ICN 09:15\n直飞 · 14h 35m · A$812"} /></label>
                  <div className="flight-import-actions">
                    <button type="button" onClick={() => applyFlightImport()} disabled={flightImportText.trim().length < 8}>识别粘贴文字</button>
                    <label><FileImage size={17} /><span>{ocrState === "reading" ? `本地识别中 ${ocrProgress}%` : flightScreenshotName || "上传航班截图"}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={ocrState === "reading"} onChange={(input) => recognizeFlightScreenshot(input.target.files?.[0])} /></label>
                  </div>
                  {flightImportMessage ? <p className={`flight-import-message ${ocrState === "error" ? "flight-import-message--error" : ""}`} role="status">{flightImportMessage}</p> : null}
                </section> : null}

                {flightMode === "recommended" ? <div className="real-flight-search">
                  <div className="airport-pair">
                    <label><span>出发机场</span><input value={originAirport} onChange={(input) => { setOriginAirport(input.target.value.toUpperCase()); setSelectedRemoteFlight(null); }} maxLength={3} /></label>
                    <label><span>抵达机场</span><input value={destinationAirport} onChange={(input) => { setDestinationAirport(input.target.value.toUpperCase()); setSelectedRemoteFlight(null); }} maxLength={3} /></label>
                  </div>
                  <button type="button" className="real-flight-button" disabled={flightSearchState === "loading"} onClick={searchRealFlights}>{flightSearchState === "loading" ? <SpinnerGap size={18} className="is-spinning" /> : <MagnifyingGlass size={18} />} {flightSearchState === "loading" ? "正在查询" : "搜索真实候选"}</button>
                  {flightSearchMessage ? <p className={`real-flight-message real-flight-message--${flightSearchState}`} role="status">{flightSearchMessage}</p> : <p className="real-flight-message">可选增强：需要在服务器配置 Amadeus 免费测试密钥。</p>}
                  {remoteFlights.length ? <div className="remote-flight-list" aria-label="真实航班候选">{remoteFlights.map((candidate) => <button type="button" key={candidate.id} aria-pressed={selectedRemoteFlight?.id === candidate.id} onClick={() => setSelectedRemoteFlight(candidate)}><span><strong>{candidate.flightNumber}</strong><small>{candidate.stops ? `${candidate.stops} 次转机` : "直飞"} · {candidate.duration ?? "时长未知"}</small></span><span><strong>{candidate.price ? `${candidate.price.currency} ${candidate.price.amount}` : "价格未知"}</strong><small>{flightTime(candidate.departureAt, "Australia/Melbourne")} → {flightTime(candidate.arrivalAt, "Asia/Seoul")}</small></span></button>)}</div> : null}
                </div> : null}

                {flightMode === "flight-number" ? <div className="flight-number-entry">
                  <label><span>航班号</span><div><input value={flightNumber} onChange={(input) => { setFlightNumber(input.target.value); setFlightLookup(null); }} placeholder="例如 KE402" autoCapitalize="characters" /><button type="button" onClick={lookUpFlightNumber}><MagnifyingGlass size={17} /> 检查</button></div></label>
                  {flightLookup ? <p className={`flight-lookup-message flight-lookup-message--${flightLookup.status}`} role="status">{flightLookup.message}</p> : <p className="flight-lookup-message">免费模式先校验格式；接入数据提供商后这里会自动补齐时刻。</p>}
                </div> : null}

                {flightMode !== "recommended" ? <div className="flight-schedule-grid">
                  <label><span>出发机场</span><input value={originAirport} onChange={(input) => setOriginAirport(input.target.value)} maxLength={4} /></label>
                  <label><span>抵达机场</span><input value={destinationAirport} onChange={(input) => setDestinationAirport(input.target.value)} maxLength={4} /></label>
                  <label><span>起飞时间（出发地）</span><input type="datetime-local" value={flightDepartureAt} onChange={(input) => setFlightDepartureAt(input.target.value)} /></label>
                  <label><span>抵达时间（韩国）</span><input type="datetime-local" value={flightArrivalAt} onChange={(input) => setFlightArrivalAt(input.target.value)} /></label>
                  <label><span>转机次数</span><input type="number" min="0" max="4" value={flightStops} onChange={(input) => setFlightStops(Number(input.target.value))} /></label>
                </div> : null}
                <label className="return-home-field"><span>预计返程到家时间</span><input type="datetime-local" value={assumedReturnHomeAt} onChange={(input) => setAssumedReturnHomeAt(input.target.value)} /></label>
              </section>
              <footer className="flow-panel-actions">
                <Button tone="secondary" onClick={() => setStep("availability")}>重新识别</Button>
                <Button tone="primary" disabled={!flightReady} onClick={calculateAndSave} icon={<AirplaneTilt size={17} weight="fill" />}>开始判断</Button>
              </footer>
            </section>
          ) : null}

          {step === "result" ? (
            <section className="flow-panel result-panel">
              <div className={`result-stamp ${calculation.feasible ? "" : "result-stamp--no"}`}><Check size={28} weight="bold" /><span>{calculation.feasible ? "YOU CAN GO" : "TIMING RISK"}</span></div>
              <p className="flow-artist">{event.artist} · {event.city.toUpperCase()}</p>
              <h2>{calculation.feasible ? `${risk === "relaxed" ? "悠闲" : risk === "extreme" ? "极限" : "标准"}模式下赶得上` : "当前条件下不建议出发"}</h2>
              <p className="result-summary">{calculation.reason}。最晚从 {origin} 离开的时间为 <strong>{formatTimelineTime(calculation.latestHomeDepartureAt, "leave-home")}</strong>{calculation.eventBufferMinutes >= 0 ? <>，抵达场馆后仍有 <strong>{calculation.eventBufferMinutes} 分钟</strong>余量。</> : <>，预计会晚 <strong>{Math.abs(calculation.eventBufferMinutes)} 分钟</strong>。</>}</p>
              <ol className="route-timeline">
                {calculation.timeline.map((item) => <li key={item.id}><time>{formatTimelineTime(item.at, item.id)}</time><div><strong>{item.id === "leave-home" ? `从 ${origin} 出发` : item.id === "venue" ? `抵达 ${event.venue} 周边` : item.title}</strong><span>{item.detail}</span></div></li>)}
              </ol>
              <aside className="assumption-note"><ShieldCheck size={20} /><div><strong>这是时间可行性判断，不代表真实航班仍有座位</strong><p>本次使用“{selectedFlight.sourceLabel}”。出发前请以航司页面的日期、时刻和机场为准。</p></div></aside>
              <dl className="result-assumptions" aria-label="本次时间假设">
                <div><dt>家到机场</dt><dd>{calculation.assumptions.homeToAirportMinutes} 分钟</dd></div>
                <div><dt>机场提前</dt><dd>{calculation.assumptions.airportAdvanceMinutes} 分钟</dd></div>
                <div><dt>入境取行李</dt><dd>{calculation.assumptions.immigrationMinutes} 分钟</dd></div>
                <div><dt>机场到场馆</dt><dd>{calculation.assumptions.arrivalAirportToVenueMinutes} 分钟</dd></div>
                <div><dt>{risk === "relaxed" ? "悠闲" : risk === "extreme" ? "极限" : "标准"}提前量</dt><dd>{calculation.assumptions.venueArrivalLeadMinutes[risk]} 分钟</dd></div>
              </dl>
              <footer className="flow-panel-actions">
                <Button tone="secondary" onClick={() => setStep("confirm")}>调整条件</Button>
                <Button tone="primary" onClick={() => setStep("plan")}>生成首尔旅行计划</Button>
              </footer>
            </section>
          ) : null}

          {step === "plan" ? <TripPlanView event={event} flight={selectedFlight} feasibility={calculation} assumedReturnHomeAt={`${assumedReturnHomeAt}:00+10:00`} onBack={() => setStep("result")} /> : null}
        </div>

        <aside className="flow-ticket-summary">
          <span>YOUR LIVE TICKET</span>
          <h2>{event.title}</h2>
          <p>{event.artist} · {event.type}</p>
          <div className="mini-ticket-meta"><span>{eventDay.slice(5).replace("-", ".")}</span><span>{new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" }).format(new Date(event.startsAt))}</span><span>{event.city.toUpperCase()}</span></div>
          <div className="mini-ticket-route">MEL <AirplaneTilt size={17} weight="fill" /> SEL</div>
          <small>活动开始前所有时间均可再次调整</small>
        </aside>
      </div>
    </section>
  );
}
