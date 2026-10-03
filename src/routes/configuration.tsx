import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Save, CheckCircle2, Loader2, TriangleAlert, Database, KeyRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getConfig, saveConfig, type AppConfig } from "@/lib/config";

export const Route = createFileRoute("/configuration")({
  head: () => ({
    meta: [
      { title: "Configuration — Chatplay" },
      { name: "description", content: "Renseignez les connexions Supabase de Chatplay." },
      { property: "og:title", content: "Configuration — Chatplay" },
      { property: "og:description", content: "Connectez votre base de données." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Configuration,
});

const FIELDS = [
  {
    key: "supabaseUrl" as const,
    label: "URL Supabase",
    icon: Database,
    hint: "Dans Supabase : Settings → API → Project URL (https://xxxx.supabase.co)",
    validate: (v: string) => /^https:\/\/[^\s]+\.[^\s]+$/.test(v) || "Doit être une adresse commençant par https://",
  },
  {
    key: "supabaseAnonKey" as const,
    label: "Clé publique Supabase (anon)",
    icon: KeyRound,
    hint: "Dans Supabase : Settings → API — clé « anon / publishable » (sb_publishable_… ou eyJ…)",
    validate: (v: string) => (v.trim().length >= 20 ? true : "La clé semble trop courte — copiez-la depuis Settings → API"),
  },
];

function Configuration() {
  const [values, setValues] = useState<AppConfig>(() => ({ supabaseUrl: "", supabaseAnonKey: "", ...getConfig() }));
  const [errors, setErrors] = useState<Partial<Record<keyof AppConfig, string>>>({});
  const [saved, setSaved] = useState(false);

  const set = (k: keyof AppConfig, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
    setSaved(false);
  };

  const save = () => {
    const next: Partial<Record<keyof AppConfig, string>> = {};
    for (const f of FIELDS) {
      const res = f.validate(values[f.key]);
      if (res !== true) next[f.key] = res;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    saveConfig(values);
    setSaved(true);
    // Reload so the Supabase client is rebuilt with the new values.
    setTimeout(() => window.location.reload(), 700);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <Link to="/dashboard" className="btn-ghost text-sm">Tableau de bord</Link>
      </div>

      <h1 className="mt-8 text-2xl font-bold">Configuration des connexions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Renseignez vos identifiants une seule fois : ils sont enregistrés dans ce navigateur et utilisés par toute l'application.
      </p>

      <div className="glass mt-6 space-y-5 p-5">
        {FIELDS.map((f) => {
          const Icon = f.icon;
          const error = errors[f.key];
          return (
            <div key={f.key}>
              <label htmlFor={f.key} className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4 text-primary" /> {f.label}
              </label>
              <input
                id={f.key}
                type={f.key === "supabaseAnonKey" ? "password" : "url"}
                autoComplete="off"
                spellCheck={false}
                className="field"
                placeholder={f.key === "supabaseAnonKey" ? "sb_publishable_… ou eyJ…" : "https://…"}
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
              />
              {error ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-destructive"><TriangleAlert className="h-3.5 w-3.5" />{error}</p>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">{f.hint}</p>
              )}
            </div>
          );
        })}

        <button className="btn-neon w-full" onClick={save} disabled={saved}>
          {saved ? (<><CheckCircle2 className="h-5 w-5" /> Enregistré — rechargement…</>) : (<><Save className="h-5 w-5" /> Enregistrer et recharger</>)}
        </button>
        {saved && <p className="text-center text-xs text-success">Configuration enregistrée. La page se recharge pour l'appliquer.</p>}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Ces valeurs sont publiques (clé « anon » Supabase et adresse de serveur) — elles ne contiennent aucun secret.
      </p>
    </div>
  );
}
