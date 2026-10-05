import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Save, CheckCircle2, MessageSquare, Plug, BookOpen, Package, Settings2, Bot, Loader2, AlertTriangle, QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Logo } from "@/components/Logo";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { getAgent, saveAgentConfig, type AgentConfig } from "@/lib/db";
import { useWhatsAppPairing } from "@/lib/useWhatsAppPairing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/configuration")({
  head: () => ({
    meta: [
      { title: "Configuration de l'Agent — Chatplay" },
      { name: "description", content: "Configurez le comportement et la connexion WhatsApp de votre agent Chatplay." },
      { property: "og:title", content: "Configuration de l'Agent — Chatplay" },
      { property: "og:description", content: "Configurez le comportement et la connexion WhatsApp de votre agent Chatplay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthGate><Configuration /></AuthGate>,
});

type Tab = "prompt" | "connexions" | "connaissances" | "produits" | "parametres";

const MODELS = [
  { id: "gemini-2.0-flash", name: "Gemini Flash", badge: "Gratuit", badgeColor: "bg-green-600", icon: "⚡" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", badge: "Recommandé", badgeColor: "bg-blue-600", icon: "✨" },
  { id: "google/gemini-2.5-pro", name: "Gemini Pro", badge: "PRO", badgeColor: "bg-orange-500", icon: "🧠" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o mini", badge: "Rapide", badgeColor: "bg-purple-600", icon: "🤖" },
];

const TONES = [
  { id: "normal", name: "Normal", desc: "Ton équilibré et naturel" },
  { id: "amical", name: "Amical", desc: "Chaleureux et détendu" },
  { id: "professionnel", name: "Professionnel", desc: "Formel et précis" },
  { id: "commercial", name: "Commercial", desc: "Persuasif et vendeur" },
];

const DEFAULT_PROMPT = `# PROMPT AGENT SERVICE CLIENT E-COMMERCE

## DESCRIPTION DU RÔLE
Tu es Customer Support, assistant(e) service client pour une boutique en ligne.

## PERSONNALITÉ
- Naturelle et spontanée
- Empathique et chaleureuse
- Professionnelle mais accessible

## RÈGLES
1. Réponds toujours en français
2. Sois concis : 2-4 phrases maximum
3. Pas de markdown`;

function Configuration() {
  const search = useSearch({ strict: false }) as { agent?: string };
  const agentId = search.agent;

  const [tab, setTab] = useState<Tab>("prompt");
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [model, setModel] = useState(MODELS[0].id);
  const [tone, setTone] = useState("normal");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!agentId) {
        setLoadError("Aucun agent sélectionné. Retournez au tableau de bord et cliquez sur un agent.");
        setLoading(false);
        return;
      }
      try {
        const a = await getAgent(agentId);
        if (!a) {
          setLoadError("Agent introuvable.");
          setLoading(false);
          return;
        }
        setAgent(a);
        setName(a.name || "");
        setModel(a.model || MODELS[0].id);
        setTone(a.tone || "normal");
        setPrompt(a.prompt || a.instructions || DEFAULT_PROMPT);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [agentId]);

  const save = async () => {
    if (!agentId) return;
    setSaving(true);
    setSaveError("");
    try {
      await saveAgentConfig(agentId, { model, tone, prompt, name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "prompt", label: "Prompt", icon: MessageSquare },
    { id: "connexions", label: "Connexions", icon: Plug },
    { id: "connaissances", label: "Base de connaissances", icon: BookOpen },
    { id: "produits", label: "Produits et services", icon: Package },
    { id: "parametres", label: "Paramètres", icon: Settings2 },
  ];

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">
            {agent ? `Agent : ${agent.name || "Sans nom"}` : "Configuration"}
          </span>
        </div>
        <Link to="/dashboard" className="shrink-0 text-sm font-semibold text-primary hover:opacity-80">
          Tableau de bord →
        </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loadError && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">{loadError}</div>
          </div>
        )}

        {!loadError && (
          <>
            <div className="mb-6 flex gap-1 overflow-x-auto rounded-md border border-border bg-card p-2">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon size={16} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {tab === "prompt" && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Nom de l'agent</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field"
                    placeholder="Ex : Alexia, conseillère boutique"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold">Modèle d'IA</label>
                    <span className="text-xs text-muted-foreground">
                      Prompt score <span className="font-bold text-primary">10</span>/10
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={`text-left p-3 rounded-xl border transition ${
                          model === m.id
                            ? "border-primary bg-accent"
                            : "border-border bg-card hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{m.icon} {m.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.badgeColor}`}>
                            {m.badge}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-3 block">Style de communication</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="field"
                  >
                    {TONES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold">Prompt de l'agent</label>
                    <span className="text-xs text-muted-foreground">{prompt.length} / 12000 caractères</span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, 12000))}
                    rows={16}
                    className="field resize-none font-mono text-sm"
                  />
                </div>

                {saveError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    {saveError}
                  </div>
                )}

                <Button
                  onClick={save}
                  disabled={saving}
                  className="h-12 w-full shadow-[var(--shadow-neon)]"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
                  ) : saved ? (
                    <><CheckCircle2 size={18} /> Enregistré !</>
                  ) : (
                    <><Save size={18} /> Enregistrer</>
                  )}
                </Button>
              </div>
            )}

            {tab === "connexions" && agentId && <AgentPairing agentId={agentId} />}

            {tab !== "prompt" && tab !== "connexions" && (
              <div className="py-20 text-center text-muted-foreground">
                <Bot size={48} className="mx-auto mb-4 opacity-30" />
                <p>Cette section sera bientôt disponible.</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function AgentPairing({ agentId }: { agentId: string }) {
  const w = useWhatsAppPairing(agentId);
  const connected = w.status === "connected";

  return (
    <div className="grid gap-6 rounded-md border border-border bg-card p-5 md:grid-cols-2">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Appairer WhatsApp</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Ouvrez WhatsApp sur votre téléphone</li>
          <li>Appareils connectés → Connecter un appareil</li>
          <li>Scannez le QR code ci-contre</li>
        </ol>
        <p className="text-sm">
          Statut :{" "}
          {w.loading ? (
            <span className="font-bold text-muted-foreground">Chargement…</span>
          ) : connected ? (
            <span className="font-bold text-success">
              <CheckCircle2 className="mr-1 inline h-4 w-4" />
              WhatsApp connecté{w.phone ? ` · ${w.phone}` : ""}
            </span>
          ) : w.error ? (
            <span className="font-bold text-destructive">Erreur de connexion</span>
          ) : w.qr ? (
            <span className="font-bold text-primary">Scannez le QR code</span>
          ) : w.status === "pending" || w.connecting ? (
            <span className="font-bold text-muted-foreground">Génération du QR code…</span>
          ) : (
            <span className="font-bold text-muted-foreground">Non connecté</span>
          )}
        </p>

        {w.error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {w.error}
          </div>
        )}

        {!connected && (
          <Button
            onClick={w.connect}
            disabled={w.connecting}
            className="h-12 w-full shadow-[var(--shadow-neon)]"
          >
            {w.connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            {w.connecting ? "Connexion…" : w.status === "disconnected" || w.error ? "Réessayer" : "Connecter WhatsApp"}
          </Button>
        )}
      </div>

      <div className="grid aspect-square w-full max-w-[280px] place-items-center justify-self-center rounded-md bg-foreground p-3">
        {connected ? (
          <CheckCircle2 className="h-20 w-20 text-success" />
        ) : w.qr ? (
          <QRCodeSVG value={w.qr} size={256} className="h-full w-full" />
        ) : w.loading || w.connecting || w.status === "pending" ? (
          <Loader2 className="h-12 w-12 animate-spin text-background opacity-60" />
        ) : (
          <QrCode className="h-16 w-16 text-background opacity-40" />
        )}
      </div>
    </div>
  );
            }
