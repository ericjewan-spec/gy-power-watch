import { createClient } from "@supabase/supabase-js";

// Anon client — safe to use server- and client-side.
// Reads are allowed by RLS; all writes go through the outage_write
// RPC which validates the admin secret inside Postgres.
export function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}
