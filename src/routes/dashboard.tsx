import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bot, Plus, QrCode, RefreshCw, ShieldCheck, Mic, Save, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { loadProfile } from "@/lib/api";
import { isConfigured } from "@/lib/config";
import { getAntiSpam, getProfile, getSubscription, getWaSession, listAgents, requestPairing, saveAntiSpam, upsertAgent, watchWaSession, type AgentRow, type Subscription } from "@/lib/db";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Chatplay" },
      { name: "description", content: "Gérez vos agents IA WhatsApp, appairez votre numéro et réglez l'anti-spam." },
      { property: "og:title", content: "Tableau de bord — Chatplay" },
      { property: "og:description", content: "Studio d'agents IA et appairage WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Agent = AgentRow;
const VOICES = ["Sarah", "Roger", "Laura", "George", "Charlie"];
const SUB_LABEL: Record<Subscription["status"], string> = {
  pending: "Paiement en attente", trialing: "Essai en cours", active: "Abonnement actif", canceled: "Abonnement annulé", failed: "Paiement échoué",
};

function Dashboard() {
  const [name, setName] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<Agent | null>(null);
  const [tab, setTab] = useState<"studio" | "whatsapp" | "antispam">("studio");

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    setName(loadProfile().name ?? "");
    try {
      const [p, list, s] = await Promise.all([getProfile(), listAgents(), getSubscription()]);
      if (p?.name) setName(p.name);
      setAgents(list); setSub(s);
    } catch (e) { setLoadError(e instanceof Error ? e.message : "Erreur inconnue"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveAgent = async (a: Agent) => {
    await upsertAgent(a);        // Supabase = source of truth
    setAgents((list) => (list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? a : x)) : [a, ...list]));
    setEditing(null);
  };

  const online = agents.filter((a) => a.status === "online").length;
  const newAgent = (): Agent => ({ id: crypto.randomUUID(), name: "", instructions: "", voice_enabled: false, voice: "Sarah", status: "draft" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="flex items-center justify-between"><Logo /><span className="grid h-9 w-9 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{(name || "U").charAt(0).toUpperCase()}</span></div>

      <h1 className="mt-8 text-3xl font-bold">Content de vous revoir{name ? `, ${name}` : ""} 👋</h1>
      <p className="mt-1 text-muted-foreground">Voici l'état de vos agents aujourd'hui.</p>
      {sub && (
        <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${sub.status === "active" || sub.status === "trialing" ? "bg-success/15 text-success" : sub.status === "pending" ? "bg-accent text-accent-foreground" : "bg-destructive/15 text-destructive"}`}>
          {SUB_LABEL[sub.status]}{sub.trial_ends_at && sub.status === "trialing" ? ` · jusqu'au ${new Date(sub.trial_ends_at).toLocaleDateString("fr-FR")}` : ""}
        </span>
      )}
      {loading && <div className="mt-4"><Notice kind="info">Chargement de vos données…</Notice></div>}
      {loadError && <div className="mt-4"><Notice kind="error">Impossible de charger vos données : {loadError}. <button className="font-bold underline" onClick={load}>Réessayer</button></Notice></div>}
      {!loading && !isConfigured() && (
        <div className="mt-4">
          <Notice kind="info">Connexions Supabase et serveur non configurées. <Link className="font-bold underline" to="/configuration">Renseigner la configuration</Link></Notice>
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Agents" value={agents.length} />
        <Stat label="En ligne" value={online} tone="text-success" />
        <Stat label="Brouillons" value={agents.length - online} tone="text-muted-foreground" />
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto">
        {([["studio", "Studio", Bot], ["whatsapp", "WhatsApp", QrCode], ["antispam", "Anti-spam", ShieldCheck]] as const).map(([k, l, I]) => (
          <button key={k} data-active={tab === k} onClick={() => setTab(k)} className="option-card flex shrink-0 items-center gap-2 !rounded-full !px-4 !py-2 text-sm font-semibold"><I className="h-4 w-4" />{l}</button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "studio" && (editing ? <Studio agent={editing} onSave={saveAgent} onCancel={() => setEditing(null)} /> : (
          <div className="space-y-3">
            <button className="btn-neon w-full sm:w-auto" onClick={() => setEditing(newAgent())}><Plus className="h-5 w-5" /> Créer un agent</button>
            {agents.length === 0 && <div className="glass p-8 text-center text-muted-foreground">Aucun agent pour l'instant. Créez votre premier agent IA.</div>}
            {agents.map((a) => (
              <button key={a.id} onClick={() => setEditing(a)} className="glass flex w-full items-center gap-3 p-4 text-left">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><Bot className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{a.name || "Sans nom"}</p><p className="truncate text-sm text-muted-foreground">{a.instructions || "Aucune instruction"}</p></div>
                {a.voice_enabled && <Mic className="h-4 w-4 shrink-0 text-primary" />}
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${a.status === "online" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{a.status === "online" ? "En ligne" : "Brouillon"}</span>
              </button>
            ))}
          </div>
        ))}
        {tab === "whatsapp" && <Pairing />}
        {tab === "antispam" && <AntiSpam />}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "text-primary" }: { label: string; value: number; tone?: string }) {
  return <div className="glass p-4"><p className={`font-display text-3xl font-bold ${tone}`}>{value}</p><p className="text-xs text-muted-foreground sm:text-sm">{label}</p></div>;
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-primary shadow-[var(--shadow-neon)]" : "bg-muted"}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-foreground transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const cls = kind === "error" ? "border-destructive/40 bg-destructive/10 text-destructive"
    : kind === "success" ? "border-success/40 bg-success/10 text-success" : "border-primary/30 bg-accent text-accent-foreground";
  const Icon = kind === "error" ? AlertTriangle : kind === "success" ? CheckCircle2 : Loader2;
  return <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${cls}`}><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${kind === "info" ? "animate-spin" : ""}`} /><span className="min-w-0 break-words">{children}</span></div>;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Erreur inconnue");

function Studio({ agent, onSave, onCancel }: { agent: Agent; onSave: (a: Agent) => Promise<void>; onCancel: () => void }) {
  const [a, setA] = useState(agent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setSaving(true); setError("");
    try { await onSave(a); } catch (e) { setError(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <div className="glass space-y-5 p-5">
      <h2 className="text-xl font-bold">Studio de l'agent</h2>
      <fieldset disabled={saving} className="space-y-5">
      <div><label className="text-sm font-semibold">Nom de l'agent</label><input className="field mt-2" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} placeholder="Ex : Alexia, conseillère boutique" /></div>
      <div><label className="text-sm font-semibold">Instructions</label><textarea rows={6} className="field mt-2" value={a.instructions} onChange={(e) => setA({ ...a, instructions: e.target.value })} placeholder="Tu es l'assistante de ma boutique. Réponds avec chaleur, propose nos tarifs…" /></div>
      <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary p-4">
        <div className="min-w-0"><p className="flex items-center gap-2 font-semibold"><Mic className="h-4 w-4 text-primary" /> Notes vocales ElevenLabs</p><p className="text-sm text-muted-foreground">L'agent peut répondre en audio réaliste.</p></div>
        <Toggle label="Notes vocales" on={a.voice_enabled} onChange={(v) => setA({ ...a, voice_enabled: v })} />
      </div>
      {a.voice_enabled && (
        <div className="flex flex-wrap gap-2">{VOICES.map((v) => <button key={v} data-active={a.voice === v} onClick={() => setA({ ...a, voice: v })} className="option-card !rounded-full !px-4 !py-2 text-sm font-semibold">{v}</button>)}</div>
      )}
      <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary p-4">
        <p className="font-semibold">Mettre en ligne</p>
        <Toggle label="En ligne" on={a.status === "online"} onChange={(v) => setA({ ...a, status: v ? "online" : "draft" })} />
      </div>
      </fieldset>
      {saving && <Notice kind="info">Enregistrement de l'agent sur le serveur…</Notice>}
      {error && <Notice kind="error">Impossible d'enregistrer l'agent : {error}</Notice>}
      <div className="flex gap-3">
        <button className="btn-ghost" onClick={onCancel} disabled={saving}>Annuler</button>
        <button className="btn-neon flex-1" disabled={!a.name.trim() || saving} onClick={submit}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function sessionId() {
  let id = localStorage.getItem("chatplay.session");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("chatplay.session", id); }
  return id;
}

function Pairing() {
  const [qr, setQr] = useState<string>("");
  const [status, setStatus] = useState<string>("pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const r = manual ? await requestPairing() : (await getWaSession()) ?? (await requestPairing());
      setError("");
      if (!r) return;
      if (r.status) setStatus(r.status);
      if (r.qr) setQr(r.qr.startsWith("data:") ? r.qr : `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(r.qr)}`);
    } catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    let ch: { unsubscribe: () => void } | null = null;
    watchWaSession((r) => { setStatus(r.status); if (r.qr) setQr(r.qr.startsWith("data:") ? r.qr : `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(r.qr)}`); })
      .then((c) => { ch = c; }).catch((e) => setError(errMsg(e)));
    return () => { ch?.unsubscribe(); };
  }, [load]);

  return (
    <div className="glass grid gap-6 p-5 md:grid-cols-2">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Appairer WhatsApp</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Ouvrez WhatsApp sur votre téléphone</li><li>Menu → Appareils connectés</li><li>Scannez le QR code ci-contre</li>
        </ol>
        <p className="text-sm">Statut : {loading ? <span className="font-bold text-muted-foreground">Connexion au serveur…</span>
          : status === "connected" ? <span className="font-bold text-success"><CheckCircle2 className="mr-1 inline h-4 w-4" />Connecté</span>
          : error ? <span className="font-bold text-destructive">Serveur injoignable</span>
          : <span className="font-bold text-primary">En attente du scan…</span>}</p>
        {error && <Notice kind="error">Impossible de récupérer le QR code : {error}. Mise à jour en temps réel.</Notice>}
        {status !== "connected" && (
          <button className="btn-ghost" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Actualisation…" : "Rafraîchir"}
          </button>
        )}
      </div>
      <div className="grid aspect-square w-full max-w-[280px] place-items-center justify-self-center rounded-2xl bg-foreground p-3">
        {status === "connected" ? <CheckCircle2 className="h-20 w-20 text-success" />
          : loading ? <Loader2 className="h-12 w-12 animate-spin text-background opacity-60" />
          : qr ? <img src={qr} alt="QR code WhatsApp" className={`h-full w-full ${error ? "opacity-30" : ""}`} />
          : <QrCode className="h-16 w-16 text-background opacity-40" />}
      </div>
    </div>
  );
}

const DEFAULT_AS = { maxPerHour: 30, minDelay: 4, typing: true, blockLinks: true, quietHours: false, blacklist: "" };

function AntiSpam() {
  const [s, setS] = useState(DEFAULT_AS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const r = await getAntiSpam();
      setS({ ...DEFAULT_AS, ...(r ?? {}) });
    } catch (e) { setLoadError(errMsg(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const save = async () => {
    setSaving(true); setResult(null);
    try { await saveAntiSpam(s); setResult({ kind: "success", text: "Réglages enregistrés." }); }
    catch (e) { setResult({ kind: "error", text: `Échec de l'enregistrement : ${errMsg(e)}` }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="glass p-5"><Notice kind="info">Chargement des réglages anti-spam…</Notice></div>;

  return (
    <div className="glass space-y-5 p-5">
      <h2 className="text-xl font-bold">Protection anti-spam</h2>
      {loadError && (
        <Notice kind="error">
          Réglages non chargés ({loadError}). Valeurs par défaut affichées.{" "}
          <button className="font-bold underline" onClick={fetchSettings}>Réessayer</button>
        </Notice>
      )}
      <fieldset disabled={saving} className="space-y-5">
      <Range label="Messages max par heure" value={s.maxPerHour} min={5} max={120} onChange={(v) => setS({ ...s, maxPerHour: v })} />
      <Range label="Délai minimum entre réponses (s)" value={s.minDelay} min={1} max={30} onChange={(v) => setS({ ...s, minDelay: v })} />
      {([["typing", "Simuler « en train d'écrire »"], ["blockLinks", "Bloquer les liens suspects"], ["quietHours", "Pause nocturne (23h–6h)"]] as const).map(([k, l]) => (
        <div key={k} className="flex items-center justify-between gap-4"><span className="font-semibold">{l}</span><Toggle label={l} on={s[k]} onChange={(v) => setS({ ...s, [k]: v })} /></div>
      ))}
      <div><label className="text-sm font-semibold">Mots-clés bloqués (séparés par des virgules)</label><input className="field mt-2" value={s.blacklist} onChange={(e) => setS({ ...s, blacklist: e.target.value })} placeholder="arnaque, crypto, …" /></div>
      </fieldset>
      <button className="btn-neon w-full sm:w-auto" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
      {result && <Notice kind={result.kind}>{result.text}</Notice>}
    </div>
  );
}

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-sm font-semibold"><span>{label}</span><span className="text-primary">{value}</span></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} className="mt-2 w-full accent-primary" />
    </div>
  );
}
