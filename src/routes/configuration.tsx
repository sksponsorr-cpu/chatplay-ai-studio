import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Save, CheckCircle2, MessageSquare, Plug, BookOpen, Package, Settings2, Bot, Loader2, AlertTriangle,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { getAgent, saveAgentConfig, type AgentConfig } from "@/lib/db";

export const Route = createFileRoute("/configuration")({
  head: () => ({
    meta: [{ title: "Configuration de l'Agent — Chatplay" }],
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
      <div className="grid min-h-screen place-items-center bg-neutral-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      <div className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-sm text-neutral-400 hidden sm:inline">
            {agent ? `Agent : ${agent.name || "Sans nom"}` : "Configuration"}
          </span>
        </div>
        <Link to="/dashboard" className="text-sm text-green-400 hover:text-green-300">
          Tableau de bord →
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loadError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 p-4 flex items-start gap-2 mb-6">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">{loadError}</div>
          </div>
        )}

        {!loadError && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                      active ? "bg-green-600 text-white" : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
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
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-green-500"
                    placeholder="Ex : Alexia, conseillère boutique"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold">Modèle d'IA</label>
                    <span className="text-xs text-neutral-500">
                      Prompt score <span className="text-green-400 font-bold">10</span>/10
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setModel(m.id)}
                        className={`text-left p-3 rounded-xl border transition ${
                          model === m.id
                            ? "border-green-500 bg-green-500/10"
                            : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
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
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-green-500"
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
                    <span className="text-xs text-neutral-500">{prompt.length} / 12000 caractères</span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, 12000))}
                    rows={16}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 font-mono text-sm outline-none focus:border-green-500 resize-none"
                  />
                </div>

                {saveError && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 p-4 text-sm">
                    {saveError}
                  </div>
                )}

                <button
                  onClick={save}
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
                  ) : saved ? (
                    <><CheckCircle2 size={18} /> Enregistré !</>
                  ) : (
                    <><Save size={18} /> Enregistrer</>
                  )}
                </button>
              </div>
            )}

            {tab !== "prompt" && (
              <div className="text-center py-20 text-neutral-500">
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
