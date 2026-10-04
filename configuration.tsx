import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Save, CheckCircle2, Sparkles, MessageSquare, Plug, BookOpen, Package, Settings2, Bot, Send,
  Plus, Trash2, RotateCcw, Loader2, AlertTriangle, QrCode, ArrowLeft,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Logo } from "@/components/Logo";
import { AuthGate } from "@/components/AuthGate";
import { isConfigured } from "@/lib/config";
import { useWhatsAppPairing } from "@/lib/useWhatsAppPairing";
import {
  MODELS, TONES, LANGUAGES, TEMPLATES, newAgent, getMyAgent, saveAgent, sendTestMessage,
  type AgentFull, type ChatMsg,
} from "@/lib/agent";

export const Route = createFileRoute("/configuration")({
  head: () => ({
    meta: [
      { title: "Studio de l'agent — Chatplay" },
      { name: "description", content: "Configurez et testez votre agent IA WhatsApp." },
    ],
  }),
  component: ConfigurationRoute,
});

type Tab = "prompt" | "connexions" | "connaissances" | "produits" | "parametres";
type Patch = (p: Partial<AgentFull>) => void;

function ConfigurationRoute() {
  if (!isConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="glass space-y-3 p-6">
          <h1 className="text-xl font-bold">Base de données non configurée</h1>
          <p className="text-sm text-muted-foreground">
            Ajoutez les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans votre hébergeur (Vercel →
            Settings → Environment Variables), puis redéployez le site.
          </p>
        </div>
      </div>
    );
  }
  return (
    <AuthGate>
      <Studio />
    </AuthGate>
  );
}

function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const cls =
    kind === "error" ? "border-destructive/40 bg-destructive/10 text-destructive"
    : kind === "success" ? "border-success/40 bg-success/10 text-success"
    : "border-primary/30 bg-accent text-accent-foreground";
  const Icon = kind === "error" ? AlertTriangle : kind === "success" ? CheckCircle2 : Loader2;
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${cls}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${kind === "info" ? "animate-spin" : ""}`} />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${on ? "bg-primary shadow-[var(--shadow-neon)]" : "bg-muted"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-foreground transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  STUDIO                                                             */
/* ------------------------------------------------------------------ */
function Studio() {
  const [agent, setAgent] = useState<AgentFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [view, setView] = useState<"test" | "config">("config");
  const [tab, setTab] = useState<Tab>("prompt");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const a = await getMyAgent();
      setAgent(a ?? newAgent());
      setDirty(a === null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch: Patch = (p) => {
    setAgent((a) => (a ? { ...a, ...p } : a));
    setDirty(true);
    setNotice(null);
  };

  const persist = async (next: AgentFull) => {
    setSaving(true);
    setNotice(null);
    try {
      await saveAgent(next);
      setAgent(next);
      setDirty(false);
      setNotice({ kind: "success", text: next.status === "online" ? "Agent enregistré et en ligne." : "Agent enregistré." });
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (loadError || !agent) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Notice kind="error">
          Impossible de charger l'agent : {loadError}.{" "}
          <button className="font-bold underline" onClick={load}>Réessayer</button>
        </Notice>
      </div>
    );
  }

  const online = agent.status === "online";
  const tabs: { id: Tab; label: string; icon: typeof Bot }[] = [
    { id: "prompt", label: "Prompt", icon: MessageSquare },
    { id: "connexions", label: "Connexions", icon: Plug },
    { id: "connaissances", label: "Connaissances", icon: BookOpen },
    { id: "produits", label: "Produits", icon: Package },
    { id: "parametres", label: "Paramètres", icon: Settings2 },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Barre du haut */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" aria-label="Retour au tableau de bord" className="grid h-9 w-9 place-items-center rounded-full bg-secondary hover:opacity-80">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Logo />
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
          {online ? "En ligne" : "Brouillon"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          className="field !w-auto min-w-0 flex-1 font-semibold" value={agent.name} maxLength={60}
          onChange={(e) => patch({ name: e.target.value })} aria-label="Nom de l'agent" placeholder="Nom de l'agent"
        />
        <button className="btn-ghost" onClick={() => persist(agent)} disabled={saving || !dirty}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : dirty ? <Save className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {dirty ? "Enregistrer" : "Enregistré"}
        </button>
        <button className="btn-neon !px-5 !py-2.5" onClick={() => persist({ ...agent, status: online ? "draft" : "online" })} disabled={saving}>
          {online ? "Mettre en pause" : "Déployer"}
        </button>
      </div>
      {notice && <div className="mt-3"><Notice kind={notice.kind}>{notice.text}</Notice></div>}

      {/* Onglets mobile : Tester / Configurer */}
      <div className="mt-4 flex gap-2 lg:hidden">
        {([["test", "Tester"], ["config", "Configurer"]] as const).map(([k, l]) => (
          <button key={k} data-active={view === k} onClick={() => setView(k)} className="option-card flex-1 !rounded-full !px-4 !py-2 text-center text-sm font-semibold">{l}</button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className={`${view === "test" ? "block" : "hidden"} lg:block`}>
          <ChatPanel agent={agent} />
        </div>

        <div className={`${view === "config" ? "block" : "hidden"} min-w-0 lg:block`}>
          <div className="flex gap-2 overflow-x-auto pb-3">
            {tabs.map((t) => (
              <button key={t.id} data-active={tab === t.id} onClick={() => setTab(t.id)}
                className="option-card flex shrink-0 items-center gap-2 !rounded-full !px-4 !py-2 text-sm font-semibold">
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
          <div className="mt-2">
            {tab === "prompt" && <PromptTab agent={agent} patch={patch} />}
            {tab === "connexions" && <ConnexionsTab />}
            {tab === "connaissances" && <KnowledgeTab agent={agent} patch={patch} />}
            {tab === "produits" && <ProductsTab agent={agent} patch={patch} />}
            {tab === "parametres" && <SettingsTab agent={agent} patch={patch} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TEST (style WhatsApp)                                              */
/* ------------------------------------------------------------------ */
type Bubble = { role: "user" | "assistant"; content: string; at: string; error?: boolean };
const nowHM = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function ChatPanel({ agent }: { agent: AgentFull }) {
  const [msgs, setMsgs] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const modelName = MODELS.find((m) => m.id === agent.model)?.name ?? agent.model;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: Bubble[] = [...msgs, { role: "user", content: text, at: nowHM() }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const history: ChatMsg[] = next.filter((m) => !m.error).slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const reply = await sendTestMessage(agent, history);
      setMsgs((m) => [...m, { role: "assistant", content: reply, at: nowHM() }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: e instanceof Error ? e.message : "Erreur inconnue", at: nowHM(), error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass flex h-[72vh] flex-col overflow-hidden lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Bot className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{agent.name || "Mon agent"}</p>
          <p className="truncate text-xs text-muted-foreground">{busy ? "est en train d'écrire…" : `Test · ${modelName}`}</p>
        </div>
        <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => setMsgs([])} aria-label="Nouvelle conversation">
          <RotateCcw className="h-4 w-4" /> Nouvelle
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {agent.welcome_message && (
          <div className="flex justify-start"><div className="max-w-[80%] rounded-2xl rounded-bl-md bg-secondary px-4 py-2 text-sm">{agent.welcome_message}</div></div>
        )}
        {msgs.length === 0 && !agent.welcome_message && (
          <div className="mt-10 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
            Écrivez un message pour tester votre agent.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
              m.error ? "border border-destructive/40 bg-destructive/10 text-destructive"
              : m.role === "user" ? "rounded-br-md bg-bubble-out" : "rounded-bl-md bg-secondary"}`}>
              {m.content}
              <span className="mt-1 block text-right text-[10px] opacity-60">{m.at}</span>
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-secondary px-4 py-3">
              {[0, 1, 2].map((d) => <span key={d} className="animate-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 border-t p-3">
        <input
          className="field !rounded-full" placeholder="Message" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
        />
        <button className="btn-neon !h-11 !w-11 shrink-0 !p-0" onClick={send} disabled={busy || !input.trim()} aria-label="Envoyer">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ONGLETS                                                            */
/* ------------------------------------------------------------------ */
function PromptTab({ agent, patch }: { agent: AgentFull; patch: Patch }) {
  const applyTemplate = (text: string) => {
    if (agent.instructions.trim() && !window.confirm("Remplacer le prompt actuel par ce modèle ?")) return;
    patch({ instructions: text });
  };
  return (
    <div className="space-y-6">
      <div className="glass space-y-3 p-5">
        <label className="text-sm font-semibold">Modèle d'IA</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODELS.map((m) => (
            <button key={m.id} data-active={agent.model === m.id} onClick={() => patch({ model: m.id })} className="option-card !p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{m.name}</span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">{m.badge}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="glass space-y-3 p-5">
        <label className="text-sm font-semibold">Style de communication</label>
        <select className="field" value={agent.settings.tone} onChange={(e) => patch({ settings: { ...agent.settings, tone: e.target.value } })}>
          {TONES.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>)}
        </select>
      </div>

      <div className="glass space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-semibold">Prompt de l'agent</label>
          <span className="text-xs text-muted-foreground">{agent.instructions.length} / 12000</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button key={t.name} className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => applyTemplate(t.text)}>{t.name}</button>
          ))}
        </div>
        <textarea
          className="field font-mono text-sm" rows={14} value={agent.instructions}
          onChange={(e) => patch({ instructions: e.target.value.slice(0, 12000) })}
          placeholder="Décrivez le rôle de votre agent, ses règles et son style…"
        />
      </div>
    </div>
  );
}

function ConnexionsTab() {
  const w = useWhatsAppPairing();
  const connected = w.status === "connected";
  return (
    <div className="glass space-y-4 p-5">
      <h2 className="text-lg font-bold">WhatsApp</h2>
      <p className="text-sm">
        Statut :{" "}
        {w.loading ? <span className="font-bold text-muted-foreground">Chargement…</span>
        : connected ? <span className="font-bold text-success">Connecté{w.phone ? ` · ${w.phone}` : ""}</span>
        : w.qr ? <span className="font-bold text-primary">Scannez le QR code ci-dessous</span>
        : w.status === "pending" || w.connecting ? <span className="font-bold text-muted-foreground">Génération du QR code…</span>
        : <span className="font-bold text-muted-foreground">Non connecté</span>}
      </p>
      {!connected && (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Ouvrez WhatsApp sur le téléphone à connecter</li>
          <li>Appareils connectés → Connecter un appareil</li>
          <li>Scannez ce QR code avec ce téléphone depuis un autre écran</li>
        </ol>
      )}
      {w.error && <Notice kind="error">Impossible de connecter WhatsApp : {w.error}</Notice>}
      {!connected && (
        <button className="btn-neon" onClick={w.connect} disabled={w.connecting}>
          {w.connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
          {w.connecting ? "Connexion…" : w.status === "disconnected" || w.error ? "Réessayer" : "Connecter WhatsApp"}
        </button>
      )}
      {!connected && w.qr && (
        <div className="mx-auto grid aspect-square w-full max-w-[260px] place-items-center rounded-2xl bg-foreground p-3">
          <QRCodeSVG value={w.qr} size={256} className="h-full w-full" />
        </div>
      )}
      {connected && <Notice kind="success">Votre numéro est connecté. Déployez l'agent pour qu'il réponde.</Notice>}
    </div>
  );
}

function KnowledgeTab({ agent, patch }: { agent: AgentFull; patch: Patch }) {
  const list = agent.knowledge;
  const update = (i: number, p: Partial<(typeof list)[number]>) =>
    patch({ knowledge: list.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Ajoutez les informations que l'agent doit connaître : horaires, livraison, retours, FAQ…</p>
      {list.map((k, i) => (
        <div key={i} className="glass space-y-2 p-4">
          <div className="flex gap-2">
            <input className="field" placeholder="Titre (ex : Livraison)" value={k.title} onChange={(e) => update(i, { title: e.target.value })} />
            <button className="btn-ghost !px-3" aria-label="Supprimer" onClick={() => patch({ knowledge: list.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></button>
          </div>
          <textarea className="field" rows={4} placeholder="Contenu" value={k.content} onChange={(e) => update(i, { content: e.target.value })} />
        </div>
      ))}
      <button className="btn-ghost" onClick={() => patch({ knowledge: [...list, { title: "", content: "" }] })}><Plus className="h-4 w-4" /> Ajouter une information</button>
    </div>
  );
}

function ProductsTab({ agent, patch }: { agent: AgentFull; patch: Patch }) {
  const list = agent.products;
  const update = (i: number, p: Partial<(typeof list)[number]>) =>
    patch({ products: list.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Listez vos produits et services avec leurs prix : l'agent s'en servira sans rien inventer.</p>
      {list.map((p, i) => (
        <div key={i} className="glass space-y-2 p-4">
          <div className="flex gap-2">
            <input className="field" placeholder="Nom du produit" value={p.name} onChange={(e) => update(i, { name: e.target.value })} />
            <input className="field !w-32 shrink-0" placeholder="Prix" value={p.price} onChange={(e) => update(i, { price: e.target.value })} />
            <button className="btn-ghost !px-3" aria-label="Supprimer" onClick={() => patch({ products: list.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></button>
          </div>
          <textarea className="field" rows={3} placeholder="Description" value={p.description} onChange={(e) => update(i, { description: e.target.value })} />
        </div>
      ))}
      <button className="btn-ghost" onClick={() => patch({ products: [...list, { name: "", price: "", description: "" }] })}><Plus className="h-4 w-4" /> Ajouter un produit</button>
    </div>
  );
}

function SettingsTab({ agent, patch }: { agent: AgentFull; patch: Patch }) {
  const reset = () => {
    if (!window.confirm("Réinitialiser le prompt et les réglages de l'agent ?")) return;
    const d = newAgent();
    patch({
      instructions: d.instructions, model: d.model, temperature: d.temperature, max_tokens: d.max_tokens,
      welcome_message: "", knowledge: [], products: [], settings: d.settings,
    });
  };
  return (
    <div className="space-y-6">
      <div className="glass space-y-4 p-5">
        <div>
          <label className="text-sm font-semibold">Message de bienvenue</label>
          <textarea className="field mt-2" rows={2} placeholder="Ex : Bonjour ! Comment puis-je vous aider ?" value={agent.welcome_message} onChange={(e) => patch({ welcome_message: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-semibold">Langue de réponse</label>
          <select className="field mt-2" value={agent.settings.language} onChange={(e) => patch({ settings: { ...agent.settings, language: e.target.value } })}>
            {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>

      <div className="glass space-y-5 p-5">
        <div>
          <div className="flex justify-between text-sm font-semibold"><span>Créativité</span><span className="text-primary">{agent.temperature.toFixed(1)}</span></div>
          <input type="range" min={0} max={1} step={0.1} value={agent.temperature} onChange={(e) => patch({ temperature: +e.target.value })} className="mt-2 w-full accent-primary" />
        </div>
        <div>
          <div className="flex justify-between text-sm font-semibold"><span>Longueur maximale des réponses</span><span className="text-primary">{agent.max_tokens}</span></div>
          <input type="range" min={100} max={1000} step={50} value={agent.max_tokens} onChange={(e) => patch({ max_tokens: +e.target.value })} className="mt-2 w-full accent-primary" />
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold">Réponses vocales <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Bientôt</span></span>
          <Toggle label="Réponses vocales" on={false} onChange={() => {}} disabled />
        </div>
      </div>

      <button className="btn-ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Réinitialiser l'agent</button>
    </div>
  );
}
