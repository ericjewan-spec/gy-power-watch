import crypto from "crypto";
import { client } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { area, region, lat, lng } = await req.json().catch(() => ({}));
  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const ipHash = crypto.createHash("sha256").update("gywatch::" + ip).digest("hex").slice(0, 24);

  const db = client();
  const { data, error } = await db.rpc("report_outage", {
    p_area: area || "",
    p_region: region || null,
    p_ip_hash: ipHash,
    p_lat: typeof lat === "number" ? lat : null,
    p_lng: typeof lng === "number" ? lng : null,
  });

  if (error) {
    if (/already_reported/i.test(error.message)) return Response.json({ error: "already_reported" }, { status: 409 });
    if (/rate_limited/i.test(error.message)) return Response.json({ error: "rate_limited" }, { status: 429 });
    if (/invalid_area/i.test(error.message)) return Response.json({ error: "invalid_area" }, { status: 400 });
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json(data);
}
