import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bot, Plus, QrCode, ShieldCheck, Mic, Save, CheckCircle2, Loader2, AlertTriangle, Sparkles, Rocket, Pencil, Zap, History, ArrowDown, MessageCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Logo } from "@/components/Logo";
import { AuthGate } from "@/components/AuthGate";
import { BottomNav } from "@/components/BottomNav";
import { useWhatsAppPairing } from "@/lib/useWhatsAppPairing";
import { loadProfile } from "@/lib/api";
import { isConfigured } from "@/lib/config";
import { getAntiSpam, getProfile, getSubscription, listAgents, saveAntiSpam, upsertAgent, type AgentRow, type Subscription } from "@/lib/db";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Chatplay" },
      { name: "description", content: "Gérez vos agents IA WhatsApp." },
      { property: "og:title", content: "Tableau de bord — Chatplay" },
      { property: "og:description", content: "Gérez vos agents IA WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthGate><Dashboard /></AuthGate>,
});

type Agent = AgentRow;
const VOICES = ["Sarah", "Roger", "Laura", "George", "Charlie"];
const SUB_LABEL: Record<Subscription["status"], string> = {
  pending: "Paiement en attente", trialing: "Essai en cours", active: "Abonnement actif", canceled: "Abonnement annulé", failed: "Paiement échoué",
};

function Dashboard() {
  const nav = useNavigate();
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
    await upsertAgent(a);
    setAgents((list) => (list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? a : x)) : [a, ...list]));
    setEditing(null);
  };

  const online = agents.filter((a) => a.status === "online").length;
  const newAgent = (): Agent => ({ id: crypto.randomUUID(), name: "", instructions: "", voice_enabled: false, voice: "Sarah", status: "draft" });

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Logo />
        <Button
          variant="secondary"
          size="icon"
          onClick={() => nav({ to: "/profil" })}
          className="rounded-full font-bold text-primary"
          aria-label="Profil"
        >
          {(name || "U").charAt(0).toUpperCase()}
        </Button>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">Bonjour{name ? `, ${name}` : ""}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pilotez vos agents WhatsApp.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-md border border-primary/40 bg-accent px-3 py-2 font-bold text-primary">
          <Zap className="h-4 w-4 fill-current" /> 50
        </div>
      </div>
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

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Agents" value={agents.length} />
        <Stat label="En ligne" value={online} tone="text-success" />
        <Stat label="Brouillons" value={agents.length - online} tone="text-muted-foreground" />
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {([["studio", "Studio", Bot], ["whatsapp", "WhatsApp", QrCode], ["antispam", "Anti-spam", ShieldCheck]] as const).map(([k, l, I]) => (
          <button key={k} data-active={tab === k} onClick={() => setTab(k)} className="option-card flex shrink-0 items-center gap-2 !rounded-full !px-4 !py-2 text-sm font-semibold"><I className="h-4 w-4" />{l}</button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "studio" && (editing ? <Studio agent={editing} onSave={saveAgent} onCancel={() => setEditing(null)} /> : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button className="h-11 shadow-[var(--shadow-neon)]" onClick={() => setEditing(newAgent())}><Plus className="h-5 w-5" /> Nouvel agent</Button>
              <Button variant="secondary" className="h-11"><Rocket className="h-5 w-5" /> Déployer</Button>
            </div>
            {agents.length === 0 && <div className="glass p-8 text-center text-muted-foreground">Aucun agent pour l'instant. Créez votre premier agent IA.</div>}
            {agents.map((a) => (
              <article key={a.id} className="overflow-hidden rounded-md border border-border bg-card">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-secondary p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">{(a.name || "A").charAt(0).toUpperCase()}</span>
                  <div className="min-w-0"><p className="truncate text-lg font-bold">{a.name || "Sans nom"}</p><p className={`text-sm ${a.status === "online" ? "text-success" : "text-muted-foreground"}`}>{a.status === "online" ? "En ligne" : "Brouillon"}</p></div>
                  <Button variant="ghost" size="icon" onClick={() => nav({ to: "/configuration", search: { agent: a.id } })} aria-label={`Modifier ${a.name}`}><Pencil /></Button>
                </div>
                <div className="relative grid min-h-64 place-items-center overflow-hidden bg-background p-6 text-center">
                  <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_center,var(--color-primary)_0,transparent_1px)] [background-size:24px_24px]" />
                  <div className="relative">
                    <span className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-primary bg-primary/20 text-primary shadow-[var(--shadow-neon)]"><Bot className="h-10 w-10" /></span>
                    <h2 className="mt-5 text-2xl font-bold">Testez {a.name || "votre agent"} ici</h2>
                    <ArrowDown className="mx-auto mt-4 h-5 w-5 text-muted-foreground" />
                    <p className="mt-3 text-muted-foreground">Commencez par envoyer un message</p>
                  </div>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border bg-secondary px-4 py-4 text-muted-foreground">
                  <span className="truncate">Message</span><Mic className="h-6 w-6" />
                </div>
                <div className="grid grid-cols-2 gap-px border-t border-border bg-border">
                  <Button variant="secondary" className="h-12 rounded-none" onClick={() => nav({ to: "/configuration", search: { agent: a.id } })}><Pencil /> Modifier</Button>
                  <Button variant="secondary" className="h-12 rounded-none"><History /> Activité</Button>
                </div>
              </article>
            ))}
          </div>
        ))}
        {tab === "whatsapp" && <Pairing />}
        {tab === "antispam" && <AntiSpam />}
      </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Stat({ label, value, tone = "text-primary" }: { label: string; value: number; tone?: string }) {
  return <div className="rounded-md border border-border bg-card p-3"><p className={`font-display text-2xl font-bold ${tone}`}>{value}</p><p className="truncate text-xs text-muted-foreground sm:text-sm">{label}</p></div>;
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
      <div><label className="text-sm font-semibold">Instructions</label><textarea rows={6} className="field mt-2" value={a.instructions} onChange={(e) => setA({ ...a, instructions: e.target.value })} placeholder="Tu es l'assistante de ma boutique…" /></div>
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

function Pairing() {
  const w = useWhatsAppPairing();
  const connected = w.status === "connected";
  return (
    <div className="glass grid gap-6 p-5 md:grid-cols-2">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Appairer WhatsApp</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Ouvrez WhatsApp sur votre téléphone</li><li>Appareils connectés → Connecter un appareil</li><li>Scannez le QR code ci-contre</li>
        </ol>
        <p className="text-sm">Statut : {w.loading ? <span className="font-bold text-muted-foreground">Chargement…</span>
          : connected ? <span className="font-bold text-success"><CheckCircle2 className="mr-1 inline h-4 w-4" />WhatsApp connecté{w.phone ? ` · ${w.phone}` : ""}</span>
          : w.error ? <span className="font-bold text-destructive">Erreur de connexion</span>
          : w.qr ? <span className="font-bold text-primary">Scannez avec WhatsApp &gt; Appareils connectés &gt; Connecter un appareil</span>
          : w.status === "pending" || w.connecting ? <span className="font-bold text-muted-foreground">Génération du QR code…</span>
          : <span className="font-bold text-muted-foreground">Non connecté</span>}</p>
        {w.error && <Notice kind="error">Impossible de connecter WhatsApp : {w.error}</Notice>}
        <div className="flex flex-wrap gap-2">
          {!connected && (
            <button className="btn-neon" onClick={w.connect} disabled={w.connecting}>
              {w.connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              {w.connecting ? "Connexion…" : w.status === "disconnected" || w.error ? "Réessayer" : "Connecter WhatsApp"}
            </button>
          )}
          {w.hasProblem && !w.connecting && (
            <button className="btn-ghost" onClick={w.diagnose} disabled={w.diagnosing}>
              {w.diagnosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {w.diagnosing ? "Analyse…" : "Diagnostiquer avec l'IA"}
            </button>
          )}
        </div>
        {w.diagnosis && <div className="whitespace-pre-line rounded-xl border border-primary/30 bg-accent p-4 text-sm">{w.diagnosis}</div>}
      </div>
      <div className="grid aspect-square w-full max-w-[280px] place-items-center justify-self-center rounded-2xl bg-foreground p-3">
        {connected ? <CheckCircle2 className="h-20 w-20 text-success" />
          : w.qr ? <QRCodeSVG value={w.qr} size={256} className="h-full w-full" />
          : w.loading || w.connecting || w.status === "pending" ? <Loader2 className="h-12 w-12 animate-spin text-background opacity-60" />
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
