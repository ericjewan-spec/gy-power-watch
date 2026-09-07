"use client";
import { useEffect, useMemo, useState } from "react";

const TYPE_LABEL = {
  unplanned: "Outage",
  planned: "Planned",
  maintenance: "Maintenance",
  resolved: "Restored",
};

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

function DurationBadge({ o, now }) {
  if (o.status === "resolved") return <span className="duration">restored</span>;
  const start = o.start_time ? new Date(o.start_time).getTime() : null;
  const end = o.end_time ? new Date(o.end_time).getTime() : null;

  if (o.type === "unplanned" && start) {
    return <span className="duration">{fmtDuration(now - start)} without power</span>;
  }
  if (start && start > now) {
    return <span className="duration">starts in {fmtDuration(start - now)}</span>;
  }
  if (end && end > now) {
    return <span className="duration">{fmtDuration(end - now)} remaining</span>;
  }
  if (start) return <span className="duration">{fmtDuration(now - start)} elapsed</span>;
  return null;
}

function OutageCard({ o, now }) {
  const cls = o.status === "resolved" ? "resolved" : o.type;
  const long = o.details && o.details.length > 150 && o.details !== o.title;
  return (
    <article className={`card ${cls}`}>
      <div className="card-top">
        <span className={`badge ${cls}`}>{o.status === "resolved" ? "Restored" : TYPE_LABEL[o.type]}</span>
        <DurationBadge o={o} now={now} />
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
        Pulled automatically from GPL public advisories, with manual reports for
        Facebook notices. Not affiliated with Guyana Power &amp; Light. Report an
        emergency to GPL: Demerara 0475 · Berbice 333-2186.
        <br />A <a href="https://gplinc.com" target="_blank" rel="noreferrer">gplinc.com</a> companion by MER.
      </footer>
    </div>
  );
}
