/** Data access to the external Supabase tables (profiles, agents, subscriptions). */
import { getSupabase } from "./supabase";
import type { Profile } from "./api";

export type AgentRow = {
  id: string; name: string; instructions: string; voice_enabled: boolean; voice: string; status: "online" | "draft";
};
export type Subscription = { plan: string; status: "pending" | "trialing" | "active" | "canceled" | "failed"; trial_ends_at: string | null };

function client() {
  if (!supabase) throw new Error("base de données non configurée (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)");
  return supabase;
}

/** Returns the current user id, creating an anonymous session if needed. */
export async function ensureUser(): Promise<string> {
  const sb = client();
  const { data } = await sb.auth.getSession();
  if (data.session?.user) return data.session.user.id;
  const { data: anon, error } = await sb.auth.signInAnonymously();
  if (error || !anon.user) throw new Error(`connexion impossible : ${error?.message ?? "session absente"} (activez la connexion anonyme dans Supabase)`);
  return anon.user.id;
}

const fail = (what: string, e: { message: string } | null) => { if (e) throw new Error(`${what} : ${e.message}`); };

export async function getProfile(): Promise<Partial<Profile> | null> {
  const uid = await ensureUser();
  const { data, error } = await client().from("profiles").select("name, business, sector, volume, goal, tone, shortcuts").eq("id", uid).maybeSingle();
  fail("lecture du profil", error);
  return data;
}

export async function upsertProfile(p: Profile) {
  const uid = await ensureUser();
  const { error } = await client().from("profiles").upsert({ id: uid, ...p, updated_at: new Date().toISOString() });
  fail("enregistrement du profil", error);
}

export async function listAgents(): Promise<AgentRow[]> {
  const uid = await ensureUser();
  const { data, error } = await client().from("agents").select("id, name, instructions, voice_enabled, voice, status").eq("user_id", uid).order("created_at", { ascending: false });
  fail("lecture des agents", error);
  return (data ?? []) as AgentRow[];
}

export async function upsertAgent(a: AgentRow) {
  const uid = await ensureUser();
  const { error } = await client().from("agents").upsert({ ...a, user_id: uid, updated_at: new Date().toISOString() });
  fail("enregistrement de l'agent", error);
}

export async function getSubscription(): Promise<Subscription | null> {
  const uid = await ensureUser();
  const { data, error } = await client().from("subscriptions").select("plan, status, trial_ends_at").eq("user_id", uid).maybeSingle();
  fail("lecture de l'abonnement", error);
  return data as Subscription | null;
}

/** Marks the trial as pending before redirecting to SwyChr; the backend confirms it via webhook. */
export async function markSubscriptionPending(email: string) {
  const uid = await ensureUser();
  const { error } = await client().from("subscriptions").upsert({ user_id: uid, plan: "trial_3d_5usd", status: "pending", email, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  fail("enregistrement de l'abonnement", error);
  return uid;
}
