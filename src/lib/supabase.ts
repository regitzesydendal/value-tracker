import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Surfaced visibly in the UI so we never get cryptic 401s.
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Create .env.local with both values and restart `npm run dev`.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
