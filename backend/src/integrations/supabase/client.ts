import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../../config/env";

let serverClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (!serverClient) {
    serverClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return serverClient;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  return createClient(config.supabase.url, config.supabase.anonKey);
}
