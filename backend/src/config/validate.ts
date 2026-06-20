import process from "node:process";

function mask(value: string): string {
  if (value.length <= 8) return "***";
  return value.slice(0, 4) + "..." + value.slice(-4);
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export function validateEnv(): void {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
    "JWT_SECRET",
  ] as const;

  const missing: string[] = [];
  const empty: string[] = [];
  const invalid: string[] = [];

  for (const name of required) {
    const value = process.env[name];
    if (value === undefined) {
      missing.push(name);
    } else if (value.trim() === "") {
      empty.push(name);
    }
  }

  if (process.env.SUPABASE_URL) {
    if (!isValidUrl(process.env.SUPABASE_URL)) {
      invalid.push("SUPABASE_URL (invalid URL format)");
    }
  }

  if (
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.SUPABASE_ANON_KEY
  ) {
    console.warn(
      "  ⚠  SUPABASE_SERVICE_ROLE_KEY is identical to SUPABASE_ANON_KEY — use the service role key, not the anon key"
    );
  }

  if (missing.length > 0) {
    console.error("");
    console.error("  ❌ Missing environment variables:");
    for (const name of missing) {
      console.error(`     - ${name}`);
    }
    console.error("");
    console.error("  Create a backend/.env file with the required variables.");
    console.error("  See .env.example in the project root for reference.");
    console.error("");
    process.exit(1);
  }

  if (empty.length > 0) {
    console.error("");
    console.error("  ❌ Empty environment variables:");
    for (const name of empty) {
      console.error(`     - ${name}`);
    }
    console.error("");
    process.exit(1);
  }

  if (invalid.length > 0) {
    console.error("");
    console.error("  ❌ Invalid environment variables:");
    for (const name of invalid) {
      console.error(`     - ${name}`);
    }
    console.error("");
    process.exit(1);
  }
}

export function logSupabaseConfig(): void {
  console.log("");
  console.log("  ╔══════════════════════════════════╗");
  console.log("  ║   Supabase Configuration         ║");
  console.log("  ╠══════════════════════════════════╣");

  if (process.env.SUPABASE_URL) {
    console.log(`  ║  ✓ SUPABASE_URL        ${mask(process.env.SUPABASE_URL).padStart(22)} ║`);
  } else {
    console.log(`  ║  ✗ SUPABASE_URL        (missing)              ║`);
  }

  if (process.env.SUPABASE_ANON_KEY) {
    console.log(`  ║  ✓ SUPABASE_ANON_KEY   ${mask(process.env.SUPABASE_ANON_KEY).padStart(22)} ║`);
  } else {
    console.log(`  ║  ✗ SUPABASE_ANON_KEY   (missing)              ║`);
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`  ║  ✓ SUPABASE_SVC_ROLE   ${mask(process.env.SUPABASE_SERVICE_ROLE_KEY).padStart(22)} ║`);
  } else {
    console.log(`  ║  ✗ SUPABASE_SVC_ROLE   (missing)              ║`);
  }

  console.log("  ╚══════════════════════════════════╝");
  console.log("");
}

export async function testSupabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return { connected: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };
    }
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await supabase.from("_test_nonexistent").select("*").limit(1);
    if (error && error.code === "42P01") {
      return { connected: true };
    }
    if (error && error.code === "PGRST116") {
      return { connected: true };
    }
    if (error) {
      return { connected: false, error: error.message };
    }
    return { connected: true };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : String(err) };
  }
}
