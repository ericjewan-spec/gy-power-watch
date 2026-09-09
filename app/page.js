"use client";
import { useEffect, useMemo, useState } from "react";

const TYPE_LABEL = {
  unplanned: "Outage",
  planned: "Planned",
  maintenance: "Maintenance",
  resolved: "Restored",
};

const GY_AREAS = [
  "Georgetown", "Kitty", "Campbellville", "Alberttown", "Sophia", "Better Hope",
  "Vryheid's Lust", "Beterverwagting", "Triumph", "Mon Repos", "Lusignan",
  "Annandale", "Buxton", "Enmore", "Golden Grove", "Haslington", "Victoria",
  "Cove and John", "Mahaica", "Diamond", "Grove", "Providence", "Eccles",
  "Herstelling", "Soesdyke", "Timehri", "Vreed-en-Hoop", "Parika", "Leonora",
  "Uitvlugt", "Tuschen", "New Amsterdam", "Rose Hall", "Corriverton", "Linden",
  "Anna Regina", "Charity", "Bartica", "Lethem", "Mabaruma", "Port Kaituma",
];

function fmtDuration(ms) {
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function fmtWindow(start, end) {
  const opts = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  const s = start ? new Date(start).toLocaleString("en-GY", opts) : null;
  const e = end ? new Date(end).toLocaleString("en-GY", opts) : null;
  if (s && e) return `${s} → ${e}`;
  return s || "";
}

function OutageCard({ o, now }) {
  const cls = o.status === "resolved" ? "resolved" : o.type;
  const long = o.details && o.details.length > 150 && o.details !== o.title;
  return (
    <article className={`card ${cls}`}>
      <div className="card-top">
        <span className={`badge ${cls}`}>{o.status === "resolved" ? "Restored" : TYPE_LABEL[o.type]}</span>
      </div>
      <h3>{o.title}</h3>
      <p className="meta">
        {[o.areas, o.region].filter(Boolean).join(" · ")}
        {(o.areas || o.region) && (o.start_time || o.end_time) ? " · " : ""}
        {fmtWindow(o.start_time, o.end_time)}
      </p>
      {long ? (
        <details>
          <summary>Full notice</summary>
          <p className="details">{o.details}</p>
        </details>
      ) : o.details && o.details !== o.title ? (
        <p className="details">{o.details}</p>
      ) : null}
      <p className="meta" style={{ marginTop: 8 }}>
        Source:{" "}
        {o.source_url ? <a href={o.source_url} target="_blank" rel="noreferrer">{o.source}</a> : o.source}
      </p>
    </article>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("all");
  const [now, setNow] = useState(Date.now());
  const [fetchedAt, setFetchedAt] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [area, setArea] = useState("");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [sending, setSending] = useState(false);
  const [reportMsg, setReportMsg] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/outages", { cache: "no-store" });
      const json = await res.json();
      setData(json);
      setFetchedAt(new Date());
    } catch {
      setData({ active: [], resolved: [], error: true });
    }
  }

  useEffect(() => {
    load();
    const tick = setInterval(() => setNow(Date.now()), 30000);
    const refresh = setInterval(load, 5 * 60000);
    return () => { clearInterval(tick); clearInterval(refresh); };
  }, []);

  function openReport() {
    setReportOpen(true);
    setReportMsg("");
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lng: longitude });
          try {
            const r = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            const j = await r.json();
            const suggestion = j.locality || j.city || "";
            if (suggestion) setArea((prev) => prev || suggestion);
          } catch {}
          setLocating(false);
        },
        () => setLocating(false),
        { timeout: 8000, maximumAge: 120000 }
      );
    }
  }

  async function sendReport() {
    if (area.trim().length < 3) { setReportMsg("Enter your area (at least 3 letters)."); return; }
    setSending(true); setReportMsg("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area: area.trim(),
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setReportMsg(
          j.merged
            ? `🔦 ${j.area}: ${j.reports} reports and counting. Thanks for keeping Guyana informed!`
            : `⚡ First to report ${j.area || "your area"}! It's on the board — share so neighbours can confirm.`
        );
        setReportOpen(false);
        setArea("");
        load();
      } else if (j.error === "already_reported") {
        setReportMsg("🙌 You already reported this blackout — we got you!");
        setReportOpen(false);
        setArea("");
      } else if (j.error === "rate_limited") {
        setReportMsg("Too many reports from your connection — try again later.");
      } else {
        setReportMsg("Could not send — check the area name and try again.");
      }
    } catch {
      setReportMsg("Could not send — check your connection.");
    }
    setSending(false);
  }

  const active = data?.active || [];
  const filtered = useMemo(
    () => (tab === "all" ? active : active.filter((o) => o.type === tab)),
    [active, tab]
  );
  const liveCount = active.filter((o) => o.type === "unplanned").length;

  return (
    <div className="wrap">
      <header className="site">
        <div className="brand">GY <em>Power</em> Watch</div>
        <p className="tagline">Outages, planned shutdowns and maintenance across Guyana</p>
      </header>

      <div className="pulse">
        <span className="count">{data ? liveCount : "–"}</span>
        <span className="count-label">
          {liveCount === 1 ? "area currently without power" : "areas currently without power"}
        </span>
        <span className="updated">
          {fetchedAt ? `updated ${fetchedAt.toLocaleTimeString("en-GY", { hour: "numeric", minute: "2-digit" })}` : "loading…"}
        </span>
      </div>

      {data?.stats && (
        <p className="meta" style={{ paddingBottom: 10 }}>
          {data.stats.total_outages} outage{data.stats.total_outages === 1 ? "" : "s"} recorded across Guyana in {data.stats.year}
        </p>
      )}

      <div className="form-grid" style={{ paddingBottom: 6, paddingTop: 4 }}>
        {!reportOpen ? (
          <button className="btn ghost" onClick={openReport}>
            ⚡ Blackout? Report it in 5 seconds
          </button>
        ) : (
          <>
            <label>
              Your area {locating ? "(finding your location…)" : ""}
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Better Hope"
                maxLength={60}
                list="gy-areas"
              />
            </label>
            <datalist id="gy-areas">
              {GY_AREAS.map((a) => <option key={a} value={a} />)}
            </datalist>
            <button className="btn" onClick={sendReport} disabled={sending}>
              {sending ? "Sending…" : "Report outage"}
            </button>
          </>
        )}
        {reportMsg && <p className="notice">{reportMsg}</p>}
      </div>

      {data?.leaderboard?.length > 0 && (
        <>
          <h2 className="section-h">🏆 2026 Blackout Leaderboard</h2>
          <p className="meta" style={{ marginBottom: 10 }}>
            Villages with the most reported blackouts this year
          </p>
          <div className="board">
            {data.leaderboard.map((r, i) => (
              <div key={r.area} className="lb-row">
                <span className="lb-rank">{i === 0 ? "��" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
                <span className="lb-area">{r.area}</span>
                <span className="lb-count">{r.blackouts} blackout{r.blackouts === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <nav className="tabs" aria-label="Filter outages">
        {[
          ["all", "All"],
          ["unplanned", "Outages"],
          ["planned", "Planned"],
          ["maintenance", "Maintenance"],
        ].map(([k, label]) => (
          <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </nav>

      {data === null ? (
        <div className="empty">Checking the grid…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <span className="glyph">✦</span>
          {tab === "all"
            ? "No reported outages right now. Power looks steady."
            : `Nothing under ${TYPE_LABEL[tab]?.toLowerCase() || tab} at the moment.`}
        </div>
      ) : (
        filtered.map((o) => <OutageCard key={o.id} o={o} now={now} />)
      )}

      {data?.resolved?.length > 0 && (
        <>
          <h2 className="section-h">Restored in the last 24 hours</h2>
          {data.resolved.map((o) => <OutageCard key={o.id} o={o} now={now} />)}
        </>
      )}

      <footer className="site">
        Pulled automatically from GPL public advisories and Guyanese news feeds,
        plus community reports from residents. Not affiliated with Guyana Power
        &amp; Light. Report an emergency to GPL: Demerara 0475 · Berbice 333-2186.
        <br />A <a href="https://gplinc.com" target="_blank" rel="noreferrer">gplinc.com</a> companion by MER.
      </footer>
    </div>
  );
}
