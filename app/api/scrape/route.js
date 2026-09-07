import * as cheerio from "cheerio";
import { client } from "../../../lib/supabase";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sources scraped every run (Vercel cron — see vercel.json)
const SOURCES = [
  {
    url: "https://gplinc.com/block/home-power-alerts/",
    label: "GPL Power Alerts",
    defaultType: "unplanned",
  },
  {
    url: "https://gplinc.com/block/home-power-watch/",
    label: "GPL Power Watch",
    defaultType: "planned",
  },
  {
    url: "https://gplinc.com/block/dashboard/",
    label: "GPL Advisories",
    defaultType: "planned",
  },
];

const MAINTENANCE_WORDS = /maintenance|upgrade|repairs?|servicing|works?\b/i;
const PLANNED_WORDS = /planned|scheduled|shutdown|interruption/i;

function classify(text, fallback) {
  if (MAINTENANCE_WORDS.test(text)) return "maintenance";
  if (PLANNED_WORDS.test(text)) return "planned";
  return fallback;
}

function hash(s) {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 16);
}

async function scrapeSource(src) {
  const res = await fetch(src.url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GYPowerWatch/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);

  const items = [];
  // GPL renders notices inside the entry content area. Grab meaningful
  // blocks and skip nav/boilerplate/"no current alerts" placeholders.
  $(".entry-content p, .entry-content li, article p, article li, .elementor-widget-container p").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length < 40) return; // skip short/boilerplate lines
    if (/no current power alerts/i.test(text)) return;
    if (/emergency hotlines|call centre|whatsapp|livechat/i.test(text)) return;
    items.push({
      external_id: hash(src.url + "::" + text),
      title: text.slice(0, 140),
      details: text,
      type: classify(text, src.defaultType),
      source: src.label,
      source_url: src.url,
    });
  });
  return items;
}

export async function GET(req) {
  const db = client();
  const secret = process.env.ADMIN_KEY || "";
  let found = 0, inserted = 0, errors = [];

  for (const src of SOURCES) {
    try {
      const items = await scrapeSource(src);
      found += items.length;
      for (const item of items) {
        const { error } = await db.rpc("outage_write", {
          admin_secret: secret,
          action: "insert",
          payload: { ...item, status: "ongoing", start_time: new Date().toISOString() },
        });
        if (!error) inserted++;
      }
    } catch (e) {
      errors.push(`${src.label}: ${e.message}`);
    }
  }

  // Auto-resolve planned outages whose end time has passed
  await db.rpc("outage_write", { admin_secret: secret, action: "resolve_expired", payload: {} });

  return Response.json({ ok: true, found, inserted, errors });
}
