/** Runtime configuration — values saved from /configuration take priority over build-time VITE_ env vars. */
const KEY = "chatplay.config";

export type AppConfig = { supabaseUrl: string; supabaseAnonKey: string; backendUrl: string };

function readStored(): Partial<AppConfig> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

/** Merged config: locally saved values first, then VITE_ env vars as fallback. */
export function getConfig(): Partial<AppConfig> {
  const s = readStored();
  return {
    supabaseUrl: s.supabaseUrl || (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) || "",
    supabaseAnonKey: s.supabaseAnonKey || (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) || "",
    backendUrl: s.backendUrl || (import.meta.env["VITE_BACKEND_URL"] as string | undefined) || "",
  };
}

export function saveConfig(c: AppConfig) {
  localStorage.setItem(KEY, JSON.stringify({ supabaseUrl: c.supabaseUrl.trim(), supabaseAnonKey: c.supabaseAnonKey.trim(), backendUrl: c.backendUrl.trim() }));
}

export function clearConfig() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

export function isConfigured(): boolean {
  const c = getConfig();
  return Boolean(c.supabaseUrl && c.supabaseAnonKey && c.backendUrl);
}
