/** Client for the Railway backend (VITE_BACKEND_URL). */
export const BACKEND_URL = ((import.meta.env['VITE_BACKEND_URL'] as string | undefined) ?? "").replace(/\/$/, "");

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BACKEND_URL) throw new Error("adresse du serveur non configurée (VITE_BACKEND_URL)");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
  } catch (e) {
    throw new Error(ctrl.signal.aborted ? "le serveur ne répond pas (délai dépassé)" : "serveur injoignable, vérifiez votre connexion");
  } finally { clearTimeout(timer); }
  const text = await res.text();
  let body: unknown = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { message: text }; }
  if (!res.ok) {
    const b = body as { error?: string; message?: string };
    throw new Error(`${b.error || b.message || res.statusText || "erreur serveur"} (code ${res.status})`);
  }
  return body as T;
}

export type QrResponse = { qr?: string; status?: "pending" | "connected" | "disconnected" };

export const backend = {
  getQr: (sessionId: string) => api<QrResponse>(`/whatsapp/qr?session=${encodeURIComponent(sessionId)}`),
  getStatus: (sessionId: string) => api<QrResponse>(`/whatsapp/status?session=${encodeURIComponent(sessionId)}`),
  getAntiSpam: (sessionId: string) =>
    api<{ settings?: Record<string, unknown> } & Record<string, unknown>>(`/whatsapp/antispam?session=${encodeURIComponent(sessionId)}`),
  saveAntiSpam: (sessionId: string, settings: unknown) =>
    api(`/whatsapp/antispam`, { method: "POST", body: JSON.stringify({ sessionId, settings }) }),
  saveAgent: (agent: unknown) => api(`/agents`, { method: "POST", body: JSON.stringify(agent) }),
  createSwychrPayment: (payload: { amount: number; currency: string; email: string; phone: string; name: string; method: "mobile_money" | "card"; userId: string; returnUrl: string }) =>
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
