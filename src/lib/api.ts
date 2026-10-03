/** Client for the Railway backend (VITE_BACKEND_URL). */
export const BACKEND_URL = ((import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "").replace(/\/$/, "");

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BACKEND_URL) throw new Error("VITE_BACKEND_URL n'est pas configuré");
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Erreur ${res.status}: ${text || res.statusText}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export type QrResponse = { qr?: string; status?: "pending" | "connected" | "disconnected" };

export const backend = {
  getQr: (sessionId: string) => api<QrResponse>(`/whatsapp/qr?session=${encodeURIComponent(sessionId)}`),
  getStatus: (sessionId: string) => api<QrResponse>(`/whatsapp/status?session=${encodeURIComponent(sessionId)}`),
  saveAntiSpam: (sessionId: string, settings: unknown) =>
    api(`/whatsapp/antispam`, { method: "POST", body: JSON.stringify({ sessionId, settings }) }),
  saveAgent: (agent: unknown) => api(`/agents`, { method: "POST", body: JSON.stringify(agent) }),
  createSwychrPayment: (payload: { amount: number; currency: string; email: string; phone: string; name: string; method: "mobile_money" | "card" }) =>
    api<{ payment_url?: string; url?: string }>(`/payments/swychr/create`, { method: "POST", body: JSON.stringify(payload) }),
};

/** Onboarding profile persisted locally between screens. */
export type Profile = {
  name: string; business: string; sector: string; volume: string; goal: string; tone: string; shortcuts: string[];
};
const KEY = "chatplay.profile";
export const loadProfile = (): Partial<Profile> => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
};
export const saveProfile = (p: Partial<Profile>) => localStorage.setItem(KEY, JSON.stringify(p));
