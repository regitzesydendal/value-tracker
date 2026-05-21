// Supabase project credentials.
//
// These values are SAFE to commit to a public repo:
// - The URL identifies your project; it's not a secret.
// - The anon key is *designed* to be embedded in frontend code. Security comes from
//   the Row Level Security policies in supabase/schema.sql, which only let users
//   read/write their own rows.
//
// (The "service role" key — which we never use here — IS a secret and must never
// be shipped to the browser.)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
