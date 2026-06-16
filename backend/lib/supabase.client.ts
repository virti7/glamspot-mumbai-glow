import { createClient } from "@supabase/supabase-js";

// Client-safe Supabase client using only the anon key.
// Safe to ship to the browser — the anon key is public by design.

export function getSupabaseBrowserClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url) throw new Error("SUPABASE_URL is not set");
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is not set");

  return createClient(url, anonKey);
}
