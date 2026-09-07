import { client } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = client();
  const { data, error } = await db
    .from("outages")
    .select("*")
    .neq("status", "resolved")
    .order("start_time", { ascending: false })
    .limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: resolved } = await db
    .from("outages")
    .select("*")
    .eq("status", "resolved")
    .gte("updated_at", dayAgo)
    .order("updated_at", { ascending: false })
    .limit(20);

  return Response.json({ active: data || [], resolved: resolved || [] });
}

// Add an outage (admin key validated inside Postgres)
export async function POST(req) {
  const body = await req.json();
  const db = client();
  const { error } = await db.rpc("outage_write", {
    admin_secret: req.headers.get("x-admin-key") || "",
    action: "insert",
    payload: { ...body, external_id: "manual-" + Date.now() },
  });
  if (error) {
    const unauthorized = /unauthorized/i.test(error.message);
    return Response.json(
      { error: unauthorized ? "unauthorized" : error.message },
      { status: unauthorized ? 401 : 500 }
    );
  }
  return Response.json({ ok: true });
}

// Update an outage (resolve etc.)
export async function PATCH(req) {
  const body = await req.json();
  const db = client();
  const { error } = await db.rpc("outage_write", {
    admin_secret: req.headers.get("x-admin-key") || "",
    action: "update",
    payload: body,
  });
  if (error) {
    const unauthorized = /unauthorized/i.test(error.message);
    return Response.json(
      { error: unauthorized ? "unauthorized" : error.message },
      { status: unauthorized ? 401 : 500 }
    );
  }
  return Response.json({ ok: true });
}
