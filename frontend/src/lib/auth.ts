"use client";

import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables. " +
      "Create a .env.local file in the frontend directory with these values."
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

let _client: ReturnType<typeof createClient> | null = null;
export function getSupabaseBrowserClient() {
  if (!_client) _client = getSupabaseClient();
  return _client;
}

export const supabaseClient = getSupabaseBrowserClient();

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("glamspot_token");
}

export function setAccessToken(token: string): void {
  localStorage.setItem("glamspot_token", token);
  document.cookie = `glamspot_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearAccessToken(): void {
  localStorage.removeItem("glamspot_token");
  document.cookie = "glamspot_token=; path=/; max-age=0; SameSite=Lax";
}
