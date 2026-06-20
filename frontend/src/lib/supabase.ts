import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL environment variable. " +
    "Ensure frontend/.env or .env.local contains: NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. " +
    "Ensure frontend/.env or .env.local contains: NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
