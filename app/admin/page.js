"use client";
import { useEffect, useState } from "react";

export default function Admin() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    title: "",
    details: "",
    type: "unplanned",
    region: "",
    areas: "",
    start_time: "",
    end_time: "",
    source: "GPL Facebook",
    source_url: "",
  });

  useEffect(() => {
    const k = sessionStorage.getItem("adminKey");
    if (k) { setKey(k); setSaved(true); }
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/outages", { cache: "no-store" });
    const json = await res.json();
    setList(json.active || []);
  }

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function submit() {
    setMsg("");
    const body = { ...form };
    if (body.start_time) body.start_time = new Date(body.start_time).toISOString();
    else delete body.start_time;
    if (body.end_time) body.end_time = new Date(body.end_time).toISOString();
    else body.end_time = null;
    if (form.type !== "unplanned" && body.start_time && new Date(body.start_time) > new Date()) {
      body.status = "scheduled";
    }
    const res = await fetch("/api/outages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": key },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      sessionStorage.setItem("adminKey", key);
      setSaved(true);
      setMsg("Outage published.");
      setForm({ ...form, title: "", details: "", areas: "", start_time: "", end_time: "", source_url: "" });
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error === "unauthorized" ? "Wrong admin key." : "Could not save — check the fields and try again.");
    }
  }

  async function resolve(id) {
    const res = await fetch("/api/outages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ id, status: "resolved", end_time: new Date().toISOString() }),
    });
    if (res.ok) load();
    else setMsg("Could not resolve — check your admin key.");
  }

  return (
    <div className="wrap">
      <header className="site">
        <div className="brand">Power Watch <em>Admin</em></div>
        <p className="tagline">Add notices from Facebook or the field, and mark power restored</p>
      </header>

      <div className="form-grid">
        {!saved && (
          <label>
            Admin key
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Enter admin key" />
          </label>
        )}
        <label>
          Headline
          <input value={form.title} onChange={set("title")} placeholder="e.g. Emergency outage — Better Hope to Mon Repos" />
        </label>
        <label>
          Full notice (paste the GPL post here)
          <textarea rows={4} value={form.details} onChange={set("details")} />
        </label>
        <label>
          Type
          <select value={form.type} onChange={set("type")}>
            <option value="unplanned">Unplanned outage</option>
            <option value="planned">Planned outage</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </label>
        <label>
          Areas affected
          <input value={form.areas} onChange={set("areas")} placeholder="e.g. Better Hope, Vryheid's Lust, Mon Repos" />
        </label>
        <label>
          Region
          <input value={form.region} onChange={set("region")} placeholder="e.g. ECD, Region 4" />
        </label>
        <label>
          Starts
          <input type="datetime-local" value={form.start_time} onChange={set("start_time")} />
        </label>
        <label>
          Expected restoration
          <input type="datetime-local" value={form.end_time} onChange={set("end_time")} />
        </label>
        <label>
          Source link (Facebook post URL)
          <input value={form.source_url} onChange={set("source_url")} placeholder="https://facebook.com/…" />
        </label>
        <button className="btn" onClick={submit}>Publish outage</button>
        {msg && <p className="notice">{msg}</p>}
      </div>

      <h2 className="section-h">Active — tap to mark restored</h2>
      {list.map((o) => (
        <article key={o.id} className={`card ${o.type}`}>
          <div className="card-top">
            <span className={`badge ${o.type}`}>{o.type}</span>
            <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={() => resolve(o.id)}>
              Mark restored
            </button>
          </div>
          <h3>{o.title}</h3>
        </article>
      ))}
    </div>
  );
}
