/** All data access goes to the external Supabase (auth, tables, realtime, edge functions). */
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type { Profile } from "./api";

export type AgentRow = {
  id: string; name: string; instructions: string; voice_enabled: boolean; voice: string; status: "online" | "draft";
};
export type Subscription = { plan: string; status: "pending" | "trialing" | "active" | "canceled" | "failed"; trial_ends_at: string | null };
export type WaSession = { status: "idle" | "pending" | "qr" | "connected" | "disconnected"; qr: string | null; phone: string | null; updated_at: string };
export type AntiSpam = { maxPerHour: number; minDelay: number; typing: boolean; blockLinks: boolean; quietHours: boolean; blacklist: string };

export function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("base de données non configurée — ouvrez la page Configuration");
  return sb;
}

const fail = (what: string, e: { message: string } | null) => { if (e) throw new Error(`${what} : ${e.message}`); };

/* ---------- Auth ---------- */
export async function currentUser() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}
async function uid(): Promise<string> {
  const u = await currentUser();
  if (!u) throw new Error("vous n'êtes pas connecté");
  return u.id;
}
export async function signInGoogle() {
  const { error } = await client().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth` } });
  fail("connexion Google", error);
}
export async function signInEmail(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "e-mail ou mot de passe incorrect" : error.message);
}
/** Returns true if a session is open immediately, false if an email confirmation is required. */
export async function signUpEmail(email: string, password: string) {
  const { data, error } = await client().auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
  fail("inscription", error);
  return Boolean(data.session);
}
export async function signOut() { await client().auth.signOut(); }

/* ---------- Profile ---------- */
export async function getProfile(): Promise<(Partial<Profile> & { onboarding_completed?: boolean }) | null> {
  const id = await uid();
  const { data, error } = await client().from("profiles").select("name, business, sector, volume, goal, tone, shortcuts, onboarding_completed").eq("id", id).maybeSingle();
  fail("lecture du profil", error);
  return data;
}
export async function upsertProfile(p: Profile) {
  const id = await uid();
  const { error } = await client().from("profiles").upsert({ id, ...p, onboarding_completed: true, updated_at: new Date().toISOString() });
  fail("enregistrement du profil", error);
}

/* ---------- Agents ---------- */
export async function listAgents(): Promise<AgentRow[]> {
  const id = await uid();
  const { data, error } = await client().from("agents").select("id, name, instructions, voice_enabled, voice, status").eq("user_id", id).order("created_at", { ascending: false });
  fail("lecture des agents", error);
  return (data ?? []) as AgentRow[];
}
export async function upsertAgent(a: AgentRow) {
  const id = await uid();
  const { error } = await client().from("agents").upsert({ ...a, user_id: id, updated_at: new Date().toISOString() });
  fail("enregistrement de l'agent", error);
}

/* ---------- Subscription / SwyChr ---------- */
export async function getSubscription(): Promise<Subscription | null> {
  const id = await uid();
  const { data, error } = await client().from("subscriptions").select("plan, status, trial_ends_at").eq("user_id", id).maybeSingle();
  fail("lecture de l'abonnement", error);
  return data as Subscription | null;
}
/** Records a pending trial, then asks the Supabase Edge Function `swychr-create` for a payment link. */
export async function startTrialPayment(input: { email: string; phone: string; name: string; method: "mobile_money" | "card" }) {
  const id = await uid();
  const { error } = await client().from("subscriptions").upsert(
    { user_id: id, plan: "trial_3d_5usd", status: "pending", email: input.email, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  fail("enregistrement de l'abonnement", error);
  const { data, error: fnErr } = await client().functions.invoke<{ payment_url?: string }>("swychr-create", {
    body: { ...input, amount: 5, currency: "USD", returnUrl: `${window.location.origin}/dashboard` },
  });
  fail("création du paiement", fnErr);
  if (!data?.payment_url) throw new Error("lien de paiement introuvable");
  return data.payment_url;
}

/* ---------- WhatsApp pairing (realtime) ---------- */
export async function requestPairing(): Promise<WaSession | null> {
  const id = await uid();
  const { data, error } = await client().from("whatsapp_sessions")
    .upsert({ user_id: id, status: "pending", updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("status, qr, phone, updated_at").maybeSingle();
  fail("demande d'appairage", error);
  return data as WaSession | null;
}
export async function getWaSession(): Promise<WaSession | null> {
  const id = await uid();
  const { data, error } = await client().from("whatsapp_sessions").select("status, qr, phone, updated_at").eq("user_id", id).maybeSingle();
  fail("lecture de la session WhatsApp", error);
  return data as WaSession | null;
}
export async function watchWaSession(onChange: (s: WaSession) => void): Promise<RealtimeChannel> {
  const id = await uid();
  return client().channel(`wa-${id}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_sessions", filter: `user_id=eq.${id}` },
      (p) => onChange(p.new as WaSession))
    .subscribe();
}

/* ---------- Anti-spam ---------- */
export async function getAntiSpam(): Promise<Partial<AntiSpam> | null> {
  const id = await uid();
  const { data, error } = await client().from("antispam_settings").select("settings").eq("user_id", id).maybeSingle();
  fail("lecture des réglages anti-spam", error);
  return (data?.settings as Partial<AntiSpam>) ?? null;
}
export async function saveAntiSpam(settings: AntiSpam) {
  const id = await uid();
  const { error } = await client().from("antispam_settings").upsert({ user_id: id, settings, updated_at: new Date().toISOString() });
  fail("enregistrement anti-spam", error);
}
