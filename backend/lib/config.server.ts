import process from "node:process";

// Server-only config. This file lives in backend/lib/ — never bundled for the browser.

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  };
}
