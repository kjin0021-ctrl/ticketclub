"use client";

import {
  ArrowLeft,
  ArrowSquareOut,
  CheckCircle,
  Flask,
  LinkSimple,
  Plus,
  Rss,
  ShieldWarning,
  XLogo,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import {
  loadLocalState,
  saveArtist,
  saveImportedPost,
  saveSource,
  type SavedArtist,
  type SavedSource,
  type TicketClubLocalState,
} from "../lib/local-store";
import { buildXProfileUrl, isXPostUrl, normalizeXHandle, testRssConnection } from "../lib/source-adapters";
import { Button } from "./ui/Button";

interface ArtistManagerProps {
  onBack: () => void;
}

const initialState = loadLocalState();

export function ArtistManager({ onBack }: ArtistManagerProps) {
  const [data, setData] = useState<TicketClubLocalState>(initialState);
  const [selectedArtistId, setSelectedArtistId] = useState(initialState.artists[0]?.id ?? "");
  const [showAddArtist, setShowAddArtist] = useState(false);
  const [artistName, setArtistName] = useState("");
  const [xInput, setXInput] = useState("");
  const [rssUrl, setRssUrl] = useState("");
  const [rssMessage, setRssMessage] = useState("");
  const [isTestingRss, setIsTestingRss] = useState(false);
  const [postUrl, setPostUrl] = useState("");
  const [postText, setPostText] = useState("");
  const [postMessage, setPostMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const latest = loadLocalState();
      setData(latest);
      setSelectedArtistId((current) => current || latest.artists[0]?.id || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedArtist = useMemo(
    () => data.artists.find((artist) => artist.id === selectedArtistId) ?? data.artists[0],
    [data.artists, selectedArtistId],
  );
  const artistSources = data.sources.filter((source) => source.artistId === selectedArtist?.id);

  function refresh(next: TicketClubLocalState) {
    setData(next);
  }

  function addArtist() {
    const handle = normalizeXHandle(xInput);
    if (!artistName.trim() || !handle) return;
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const artist: SavedArtist = {
      id,
      name: artistName.trim(),
      xHandle: handle,
      eventTypes: ["演唱会", "Fan Meeting", "签售", "公开录制"],
      notifyPossibleEvents: true,
      createdAt,
    };
    const source: SavedSource = {
      id: crypto.randomUUID(),
      artistId: id,
      kind: "x_profile",
      label: "X 官方主页",
      url: buildXProfileUrl(handle),
      status: "needs_action",
      xBellEnabled: false,
      createdAt,
    };
    refresh(saveArtist(artist, source));
    setSelectedArtistId(id);
    setArtistName("");
    setXInput("");
    setShowAddArtist(false);
  }

  function confirmBell(source: SavedSource) {
    refresh(saveSource({ ...source, xBellEnabled: true, status: "ready", lastCheckedAt: new Date().toISOString() }));
  }

  async function connectRss() {
    if (!selectedArtist || !rssUrl.trim()) return;
    setIsTestingRss(true);
    setRssMessage("正在读取 RSS…");
    const result = await testRssConnection(rssUrl.trim());
    setIsTestingRss(false);
    if (!result.ok) {
      setRssMessage(`${result.error ?? "连接失败"}。你仍可保存后稍后重试。`);
      return;
    }
    const source: SavedSource = {
      id: crypto.randomUUID(),
      artistId: selectedArtist.id,
      kind: "rsshub",
      label: result.title || "RSSHub 自动读取",
      url: rssUrl.trim(),
      status: "experimental",
      latestItemCount: result.itemCount,
      lastCheckedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    refresh(saveSource(source));
    setRssMessage(`连接成功，已真实读取 ${result.itemCount} 条内容。`);
    setRssUrl("");
  }

  function importPost() {
    if (!selectedArtist || !isXPostUrl(postUrl)) {
      setPostMessage("请粘贴包含 /status/帖子编号 的完整 X 链接。");
      return;
    }
    refresh(saveImportedPost({ id: crypto.randomUUID(), artistId: selectedArtist.id, url: postUrl.trim(), text: postText.trim() || undefined, importedAt: new Date().toISOString(), status: "pending", origin: "manual_x" }));
    setPostMessage("已保存到待识别列表，并保留原始 X 链接。");
    setPostUrl("");
    setPostText("");
  }

  return (
    <section className="artist-manager" aria-labelledby="artist-manager-title">
      <header className="manager-heading">
        <button className="back-button" type="button" onClick={onBack} aria-label="返回行程首页"><ArrowLeft size={20} /></button>
        <div><h1 id="artist-manager-title">艺人与信息源</h1><p>一个艺人可以绑定多个来源；稳定性和读取方式会明确标记。</p></div>
        <Button tone="primary" icon={<Plus size={17} />} onClick={() => setShowAddArtist((value) => !value)}>添加艺人</Button>
      </header>

      {showAddArtist ? <section className="add-artist-strip" aria-label="添加艺人">
        <label><span>艺人名称</span><input value={artistName} onChange={(event) => setArtistName(event.target.value)} placeholder="例如 KiiiKiii" /></label>
        <label><span>X 用户名或主页链接</span><input value={xInput} onChange={(event) => setXInput(event.target.value)} placeholder="@username 或 https://x.com/username" /></label>
        <Button tone="primary" disabled={!artistName.trim() || !normalizeXHandle(xInput)} onClick={addArtist}>保存艺人</Button>
      </section> : null}

      <div className="manager-layout">
        <aside className="artist-index" aria-label="关注的艺人">
          <div className="artist-index__title"><strong>关注中</strong><span>{data.artists.length}</span></div>
          {data.artists.map((artist) => <button key={artist.id} type="button" className={artist.id === selectedArtist?.id ? "is-active" : ""} onClick={() => setSelectedArtistId(artist.id)}>
            <span className="artist-index__avatar">{artist.name.slice(0, 1).toUpperCase()}</span>
            <span><strong>{artist.name}</strong><small>@{artist.xHandle}</small></span>
          </button>)}
        </aside>

        {selectedArtist ? <div className="source-workspace">
          <header className="artist-profile-row">
            <div><h2>{selectedArtist.name}</h2><p>@{selectedArtist.xHandle} · {artistSources.length} 个来源</p></div>
            <a className="profile-link" href={buildXProfileUrl(selectedArtist.xHandle)} target="_blank" rel="noreferrer">打开真实 X 主页 <ArrowSquareOut size={16} /></a>
          </header>

          <section className="source-ledger" aria-labelledby="source-ledger-title">
            <header><h3 id="source-ledger-title">提醒与自动读取</h3><p>绿色表示提醒有保障；“实验”表示会自动尝试，但可能因 X 改动失效。</p></header>
            {artistSources.map((source) => <article className="source-row" key={source.id}>
              <span className={`source-icon source-icon--${source.kind}`}>{source.kind === "x_profile" ? <XLogo size={21} weight="fill" /> : source.kind === "rsshub" ? <Rss size={21} /> : <LinkSimple size={21} />}</span>
              <div className="source-row__body"><div><h4>{source.label}</h4><span className={`source-status source-status--${source.status}`}>{source.status === "ready" ? "提醒已保障" : source.status === "experimental" ? "实验性自动读取" : source.status === "failed" ? "连接失败" : "需要操作"}</span></div><p>{source.url}</p>{source.latestItemCount ? <small>最近一次真实读取 {source.latestItemCount} 条</small> : null}</div>
              <div className="source-row__actions">
                {source.kind === "x_profile" ? <><a href={source.url} target="_blank" rel="noreferrer">去 X 开铃铛 <ArrowSquareOut size={15} /></a>{!source.xBellEnabled ? <button type="button" onClick={() => confirmBell(source)}>我已开启</button> : <span><CheckCircle size={17} weight="fill" /> 已确认</span>}</> : <a href={source.url} target="_blank" rel="noreferrer">查看订阅 <ArrowSquareOut size={15} /></a>}
              </div>
            </article>)}
          </section>

          <div className="connector-grid">
            <section className="connector-panel">
              <div className="connector-panel__icon"><Rss size={22} /></div><h3>连接自建 RSSHub</h3><p>TicketClub 会立即读取一次，成功后才能显示已连接。此来源始终标记为实验性。</p>
              <label><span>RSS 订阅地址</span><input value={rssUrl} onChange={(event) => setRssUrl(event.target.value)} placeholder="https://rss.example.com/twitter/user/..." /></label>
              {rssMessage ? <p className="connector-message" aria-live="polite">{rssMessage}</p> : null}
              <Button tone="secondary" disabled={!rssUrl.trim() || isTestingRss} onClick={connectRss} icon={<Flask size={17} />}>{isTestingRss ? "正在测试" : "测试并连接"}</Button>
            </section>

            <section className="connector-panel connector-panel--manual">
              <div className="connector-panel__icon"><LinkSimple size={22} /></div><h3>粘贴单条 X 帖子</h3><p>免费且最可靠的备用入口。帖子会进入待识别列表，原始链接不会丢失。</p>
              <label><span>帖子完整链接</span><input value={postUrl} onChange={(event) => setPostUrl(event.target.value)} placeholder="https://x.com/artist/status/..." /></label>
              <label className="post-text-label"><span>帖子文字（建议粘贴）</span><textarea value={postText} onChange={(event) => setPostText(event.target.value)} placeholder="粘贴正文后可以立即免费识别活动信息" rows={3} /></label>
              {postMessage ? <p className="connector-message" aria-live="polite">{postMessage}</p> : null}
              <Button tone="secondary" onClick={importPost} icon={<Plus size={17} />}>加入待识别</Button>
            </section>
          </div>

          <aside className="source-honesty"><ShieldWarning size={21} /><div><strong>为什么没有“永久免费自动读取”开关？</strong><p>X 官方自动读取按量收费；RSSHub 可能失效。TicketClub 用官方铃铛保障提醒，再用 RSS 或手动导入取得内容。</p></div></aside>
        </div> : null}
      </div>
    </section>
  );
}
