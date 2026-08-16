"use client";

/* Local data-URL photos are already resized before storage and cannot use a remote image optimizer. */
/* eslint-disable @next/next/no-img-element */

import { ArrowLeft, DownloadSimple, ImageSquare, MapPin, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { deleteSpot, loadLocalState, replaceSpots, saveSpot, type SavedSpot } from "../lib/local-store";
import { Button } from "./ui/Button";

const kindLabels: Record<SavedSpot["kind"], string> = { restaurant: "餐厅", sight: "景点", stay: "住宿", shop: "购物", other: "其他" };

async function resizePhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", .76);
}

interface Props { onBack: () => void }

export function SpotLibrary({ onBack }: Props) {
  const [spots, setSpots] = useState<SavedSpot[]>([]);
  const [city, setCity] = useState("全部城市");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState({ name: "", kind: "restaurant" as SavedSpot["kind"], status: "visited-revisit" as SavedSpot["status"], city: "Seoul", address: "", tags: "", suitableTime: "演出结束后仍适合", notes: "", photoDataUrl: "" });

  useEffect(() => {
    const timer = window.setTimeout(() => setSpots(loadLocalState().spots), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const cities = useMemo(() => ["全部城市", ...new Set(spots.map((spot) => spot.city).filter(Boolean))], [spots]);
  const filtered = city === "全部城市" ? spots : spots.filter((spot) => spot.city === city);

  function persistSpot() {
    if (!draft.name.trim() || !draft.address.trim() || !draft.city.trim()) {
      setMessage("请至少填写地点名称、城市和精确地址。");
      return;
    }
    const now = new Date().toISOString();
    const spot: SavedSpot = { id: crypto.randomUUID(), name: draft.name.trim(), kind: draft.kind, status: draft.status, city: draft.city.trim(), countryCode: draft.city.toLowerCase() === "seoul" ? "KR" : "", address: draft.address.trim(), tags: draft.tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean), suitableTime: draft.suitableTime.trim(), notes: draft.notes.trim(), photoDataUrl: draft.photoDataUrl || undefined, createdAt: now, updatedAt: now };
    const state = saveSpot(spot);
    setSpots(state.spots);
    setDraft({ name: "", kind: "restaurant", status: "visited-revisit", city: draft.city, address: "", tags: "", suitableTime: "演出结束后仍适合", notes: "", photoDataUrl: "" });
    setMessage("地点已经保存，并可用于下一次旅行计划。");
    setShowForm(false);
  }

  function exportSpots() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), spots }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ticketclub-spots.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importSpots(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { spots?: SavedSpot[] };
      if (!Array.isArray(parsed.spots)) throw new Error();
      const valid = parsed.spots.filter((spot) => spot && typeof spot.id === "string" && typeof spot.name === "string" && typeof spot.address === "string");
      const state = replaceSpots(valid);
      setSpots(state.spots);
      setMessage(`已导入 ${valid.length} 个地点。`);
    } catch {
      setMessage("导入失败：请选择由 TicketClub 导出的地点 JSON 文件。");
    }
  }

  return <section className="spot-library" aria-labelledby="spot-library-title">
    <header className="spot-heading"><button className="back-button" type="button" onClick={onBack} aria-label="返回首页"><ArrowLeft size={20} /></button><div><p>MY VERIFIED PLACES</p><h1 id="spot-library-title">活点地图</h1><span>把自己验证过的地点带进下一次追星旅行。</span></div><Button tone="primary" icon={<Plus size={18} />} onClick={() => setShowForm((value) => !value)}>添加地点</Button></header>

    {showForm ? <section className="spot-entry" aria-label="添加个人地点">
      <div className="spot-entry-fields">
        <label><span>地点名称</span><input value={draft.name} onChange={(input) => setDraft({ ...draft, name: input.target.value })} placeholder="餐厅、景点或 Airbnb 名称" /></label>
        <label><span>城市</span><input value={draft.city} onChange={(input) => setDraft({ ...draft, city: input.target.value })} /></label>
        <label className="spot-address"><span>精确地址</span><textarea value={draft.address} onChange={(input) => setDraft({ ...draft, address: input.target.value })} placeholder="可以直接从 Airbnb 或地图复制粘贴" rows={3} /></label>
        <label><span>类型</span><select value={draft.kind} onChange={(input) => setDraft({ ...draft, kind: input.target.value as SavedSpot["kind"] })}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>我的状态</span><select value={draft.status} onChange={(input) => setDraft({ ...draft, status: input.target.value as SavedSpot["status"] })}><option value="visited-revisit">去过，想再去</option><option value="wishlist">还没去，想去</option></select></label>
        <label><span>自定义标签</span><input value={draft.tags} onChange={(input) => setDraft({ ...draft, tags: input.target.value })} placeholder="深夜、弘大、一个人" /></label>
        <label><span>适用时间</span><input value={draft.suitableTime} onChange={(input) => setDraft({ ...draft, suitableTime: input.target.value })} placeholder="演出结束后仍营业" /></label>
        <label className="spot-address"><span>备注</span><textarea value={draft.notes} onChange={(input) => setDraft({ ...draft, notes: input.target.value })} rows={2} /></label>
      </div>
      <label className="spot-photo-upload">{draft.photoDataUrl ? <img src={draft.photoDataUrl} alt="地点照片预览" /> : <ImageSquare size={28} />}<span>{draft.photoDataUrl ? "更换照片" : "上传自己的照片"}</span><small>照片会压缩后保存在本机</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (input) => { const file = input.target.files?.[0]; if (file) setDraft({ ...draft, photoDataUrl: await resizePhoto(file) }); }} /></label>
      <footer><Button tone="secondary" onClick={() => setShowForm(false)}>取消</Button><Button tone="primary" onClick={persistSpot}>保存地点</Button></footer>
    </section> : null}

    <div className="spot-toolbar"><div className="spot-city-tabs">{cities.map((value) => <button type="button" key={value} aria-pressed={city === value} onClick={() => setCity(value)}>{value}</button>)}</div><div><button type="button" onClick={exportSpots}><DownloadSimple size={17} /> 导出</button><label><UploadSimple size={17} /> 导入<input type="file" accept="application/json" onChange={(input) => importSpots(input.target.files?.[0])} /></label></div></div>
    {message ? <p className="spot-message" role="status">{message}</p> : null}

    {filtered.length ? <div className="spot-map-layout"><div className="spot-map-canvas" aria-label="个人地点视觉地图">{filtered.map((spot, index) => <span key={spot.id} className={`spot-pin spot-pin--${spot.status}`} style={{ left: `${15 + (index * 31) % 70}%`, top: `${16 + (index * 23) % 64}%` }}><MapPin size={20} weight="fill" /><small>{spot.name}</small></span>)}</div><div className="spot-list">{filtered.map((spot) => <article key={spot.id}>{spot.photoDataUrl ? <img src={spot.photoDataUrl} alt="" /> : <div className="spot-photo-fallback"><MapPin size={24} /></div>}<div><p>{kindLabels[spot.kind]} · {spot.city}</p><h2>{spot.name}</h2><span>{spot.address}</span><div className="spot-tags"><strong>{spot.status === "visited-revisit" ? "去过，想再去" : "想去"}</strong>{spot.tags.map((tag) => <small key={tag}>{tag}</small>)}</div>{spot.suitableTime ? <em>{spot.suitableTime}</em> : null}</div><button type="button" aria-label={`删除 ${spot.name}`} onClick={() => { const state = deleteSpot(spot.id); setSpots(state.spots); }}><Trash size={17} /></button></article>)}</div></div> : <div className="spot-empty"><MapPin size={34} weight="fill" /><h2>这里还没有你的地点</h2><p>先保存一家你愿意再去的餐厅，下一次首尔计划就不会只有泛泛的地标推荐。</p><Button tone="primary" onClick={() => setShowForm(true)}>添加第一个地点</Button></div>}
  </section>;
}
