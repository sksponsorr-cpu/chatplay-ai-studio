import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bot, Plus, QrCode, RefreshCw, ShieldCheck, Mic, Save, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { backend, BACKEND_URL, loadProfile } from "@/lib/api";
import { supabase } from "@/lib/supabase";

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

type Agent = { id: string; name: string; instructions: string; voice_enabled: boolean; voice: string; status: "online" | "draft" };
const VOICES = ["Sarah", "Roger", "Laura", "George", "Charlie"];
const LS = "chatplay.agents";

function Dashboard() {
  const [name, setName] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [tab, setTab] = useState<"studio" | "whatsapp" | "antispam">("studio");

  useEffect(() => {
    setName(loadProfile().name ?? "");
    (async () => {
      if (supabase) {
        const { data } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
        if (data) return setAgents(data as Agent[]);
      }
      try { setAgents(JSON.parse(localStorage.getItem(LS) || "[]")); } catch { /* ignore */ }
    })();
  }, []);

  const persist = (list: Agent[]) => { setAgents(list); localStorage.setItem(LS, JSON.stringify(list)); };

  const saveAgent = async (a: Agent) => {
    const list = agents.some((x) => x.id === a.id) ? agents.map((x) => (x.id === a.id ? a : x)) : [a, ...agents];
    persist(list);
    if (supabase) await supabase.from("agents").upsert(a).then(() => undefined, () => undefined);
    if (BACKEND_URL) backend.saveAgent(a).catch(() => undefined);
    setEditing(null);
  };

  const online = agents.filter((a) => a.status === "online").length;
  const newAgent = (): Agent => ({ id: crypto.randomUUID(), name: "", instructions: "", voice_enabled: false, voice: VOICES[0], status: "draft" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="flex items-center justify-between"><Logo /><span className="grid h-9 w-9 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{(name || "U")[0].toUpperCase()}</span></div>

      <h1 className="mt-8 text-3xl font-bold">Content de vous revoir{name ? `, ${name}` : ""} 👋</h1>
      <p className="mt-1 text-muted-foreground">Voici l'état de vos agents aujourd'hui.</p>

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

function Studio({ agent, onSave, onCancel }: { agent: Agent; onSave: (a: Agent) => void; onCancel: () => void }) {
  const [a, setA] = useState(agent);
  return (
    <div className="glass space-y-5 p-5">
      <h2 className="text-xl font-bold">Studio de l'agent</h2>
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
      <div className="flex gap-3">
        <button className="btn-ghost" onClick={onCancel}>Annuler</button>
        <button className="btn-neon flex-1" disabled={!a.name.trim()} onClick={() => onSave(a)}><Save className="h-4 w-4" /> Enregistrer</button>
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

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await backend.getQr(sessionId());
      if (r.status) setStatus(r.status);
      if (r.qr) setQr(r.qr.startsWith("data:") ? r.qr : `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(r.qr)}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (status !== "connected") load(); }, 5000);
    return () => clearInterval(t);
  }, [load, status]);

  return (
    <div className="glass grid gap-6 p-5 md:grid-cols-2">
      <div>
        <h2 className="text-xl font-bold">Appairer WhatsApp</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Ouvrez WhatsApp sur votre téléphone</li><li>Menu → Appareils connectés</li><li>Scannez le QR code ci-contre</li>
        </ol>
        <p className="mt-4 text-sm">Statut : {status === "connected"
          ? <span className="font-bold text-success"><CheckCircle2 className="mr-1 inline h-4 w-4" />Connecté</span>
          : <span className="font-bold text-primary">En attente du scan…</span>}</p>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <button className="btn-ghost mt-4" onClick={load}><RefreshCw className="h-4 w-4" /> Rafraîchir</button>
      </div>
      <div className="grid aspect-square w-full max-w-[280px] place-items-center justify-self-center rounded-2xl bg-foreground p-3">
        {qr && status !== "connected" ? <img src={qr} alt="QR code WhatsApp" className="h-full w-full" />
          : <QrCode className="h-16 w-16 text-background opacity-40" />}
      </div>
    </div>
  );
}

function AntiSpam() {
  const [s, setS] = useState({ maxPerHour: 30, minDelay: 4, typing: true, blockLinks: true, quietHours: false, blacklist: "" });
  const [msg, setMsg] = useState("");
  useEffect(() => { try { setS((x) => ({ ...x, ...JSON.parse(localStorage.getItem("chatplay.antispam") || "{}") })); } catch { /* ignore */ } }, []);
  const save = async () => {
    localStorage.setItem("chatplay.antispam", JSON.stringify(s));
    try { await backend.saveAntiSpam(sessionId(), s); setMsg("Réglages synchronisés ✓"); }
    catch (e) { setMsg(`Enregistré localement — ${e instanceof Error ? e.message : "erreur serveur"}`); }
  };
  return (
    <div className="glass space-y-5 p-5">
      <h2 className="text-xl font-bold">Protection anti-spam</h2>
      <Range label="Messages max par heure" value={s.maxPerHour} min={5} max={120} onChange={(v) => setS({ ...s, maxPerHour: v })} />
      <Range label="Délai minimum entre réponses (s)" value={s.minDelay} min={1} max={30} onChange={(v) => setS({ ...s, minDelay: v })} />
      {([["typing", "Simuler « en train d'écrire »"], ["blockLinks", "Bloquer les liens suspects"], ["quietHours", "Pause nocturne (23h–6h)"]] as const).map(([k, l]) => (
        <div key={k} className="flex items-center justify-between gap-4"><span className="font-semibold">{l}</span><Toggle label={l} on={s[k]} onChange={(v) => setS({ ...s, [k]: v })} /></div>
      ))}
      <div><label className="text-sm font-semibold">Mots-clés bloqués (séparés par des virgules)</label><input className="field mt-2" value={s.blacklist} onChange={(e) => setS({ ...s, blacklist: e.target.value })} placeholder="arnaque, crypto, …" /></div>
      <button className="btn-neon w-full sm:w-auto" onClick={save}><Save className="h-4 w-4" /> Enregistrer</button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
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
