import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Save, CheckCircle2, Sparkles, MessageSquare, Plug, BookOpen, Package, Settings2, Bot,
} from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/configuration")({
  head: () => ({
    meta: [
      { title: "Configuration de l'Agent — Chatplay" },
      { name: "description", content: "Configurez votre agent IA WhatsApp." },
    ],
  }),
  component: Configuration,
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
Tu es Customer Support, assistant(e) service client pour une boutique en ligne. Tu aides les clients de façon amicale et naturelle.

## PERSONNALITÉ
- **Naturelle et Spontanée** : Parle fluidement, utilise des expressions courantes.
- **Empathique et Chaleureuse** : Montre de la compréhension.
- **Professionnelle mais Accessible** : Polie, jamais robotique.

## RÈGLES
1. Réponds toujours en français (sauf si le client écrit dans une autre langue).
2. Sois concis : 2-4 phrases maximum.
3. Pas de markdown, pas de listes à puces.
4. Si tu ne sais pas, propose de transférer à un humain.`;

function Configuration() {
  const [tab, setTab] = useState<Tab>("prompt");
  const [model, setModel] = useState(MODELS[0].id);
  const [tone, setTone] = useState("normal");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem("chatplay.agent", JSON.stringify({ model, tone, prompt }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "prompt", label: "Prompt", icon: MessageSquare },
    { id: "connexions", label: "Connexions", icon: Plug },
    { id: "connaissances", label: "Base de connaissances", icon: BookOpen },
    { id: "produits", label: "Produits et services", icon: Package },
    { id: "parametres", label: "Paramètres", icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-sm text-neutral-400 hidden sm:inline">Configuration de l'Agent</span>
        </div>
        <Link to="/dashboard" className="text-sm text-green-400 hover:text-green-300">
          Tableau de bord →
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? "bg-green-600 text-white"
                    : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab: Prompt */}
        {tab === "prompt" && (
          <div className="space-y-6">
            {/* Modèle */}
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

            {/* Style */}
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

            {/* Prompt editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Prompt de l'agent</label>
                <span className="text-xs text-neutral-500">
                  {prompt.length} / 12000 caractères
                </span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 12000))}
                rows={16}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 font-mono text-sm outline-none focus:border-green-500 resize-none"
              />
            </div>

            {/* Save */}
            <button
              onClick={save}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold flex items-center justify-center gap-2 transition"
            >
              {saved ? (<><CheckCircle2 size={18} /> Enregistré !</>) : (<><Save size={18} /> Enregistrer</>)}
            </button>
          </div>
        )}

        {/* Autres onglets */}
        {tab !== "prompt" && (
          <div className="text-center py-20 text-neutral-500">
            <Bot size={48} className="mx-auto mb-4 opacity-30" />
            <p>Cette section sera bientôt disponible.</p>
          </div>
        )}
      </div>
    </div>
  );
  }
