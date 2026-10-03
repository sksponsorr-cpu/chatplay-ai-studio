import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "./config";

let cached: SupabaseClient | null | undefined;

/** External Supabase client (null when not configured); created lazily on first use. */
export function getSupabase(): SupabaseClient | null {
  if (cached === undefined) {
    const { supabaseUrl, supabaseAnonKey } = getConfig();
    cached = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
  }
  return cached;
}

export const isSupabaseReady = () => Boolean(getSupabase());
