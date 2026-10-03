import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bot, Check, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AuthGate } from "@/components/AuthGate";
import { loadProfile, saveProfile, type Profile } from "@/lib/api";
import { getProfile, upsertProfile } from "@/lib/db";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Configurer votre agent — Chatplay" },
      { name: "description", content: "Configurez votre agent WhatsApp IA en 7 étapes rapides." },
      { property: "og:title", content: "Configurer votre agent — Chatplay" },
      { property: "og:description", content: "7 étapes pour lancer votre agent WhatsApp IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthGate redirectIfOnboarded><Onboarding /></AuthGate>,
});

const TOTAL = 7;
const SECTORS = ["Boutique / E-commerce", "Restauration", "Beauté & bien-être", "Services", "Immobilier", "Autre"];
const VOLUMES = ["Moins de 10", "10-50", "50-200", "Plus de 200"];
const GOALS = ["Répondre aux questions", "Prendre des commandes", "Prendre des rendez-vous", "Relancer les prospects"];
const TONES = ["Chaleureux", "Professionnel", "Décontracté"];
const SHORTCUTS = ["Mes tarifs", "Mes disponibilités", "Livraison", "Moyens de paiement", "Adresse", "Promotions"];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [p, setP] = useState<Profile>({ name: "", business: "", sector: "", volume: "", goal: "", tone: "", shortcuts: [] });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setP((x) => ({ ...x, ...loadProfile() }));
    getProfile().then((remote) => { if (remote) setP((x) => ({ ...x, ...Object.fromEntries(Object.entries(remote).filter(([, v]) => v != null)) })); }).catch(() => undefined);
  }, []);
  const set = (patch: Partial<Profile>) => setP((x) => { const n = { ...x, ...patch }; saveProfile(n); return n; });

  const canNext = [
    p.name.trim() && p.business.trim(), p.sector, p.volume, p.goal, p.tone, p.shortcuts.length > 0, true,
  ][step - 1];

  const next = async () => {
    if (step < TOTAL) return setStep(step + 1);
    setSaving(true); setSaveError("");
    try { await upsertProfile(p); navigate({ to: "/checkout" }); }
    catch (e) { setSaveError(e instanceof Error ? e.message : "Erreur inconnue"); }
    finally { setSaving(false); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-5">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="text-sm font-semibold text-muted-foreground">{step}/{TOTAL}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(step / TOTAL) * 100}%`, background: "var(--gradient-neon)", boxShadow: "0 0 12px var(--primary)" }} />
      </div>

      <div key={step} className="animate-float-up flex-1 py-8">
        {step === 1 && (
          <Q title="Faisons connaissance" sub="Comment vous appelez-vous ?">
            <input className="field" placeholder="Votre prénom" value={p.name} onChange={(e) => set({ name: e.target.value })} />
            <input className="field mt-3" placeholder="Nom de votre entreprise" value={p.business} onChange={(e) => set({ business: e.target.value })} />
          </Q>
        )}
        {step === 2 && <Q title="Votre secteur d'activité"><Choices items={SECTORS} value={p.sector} onPick={(v) => set({ sector: v })} /></Q>}
        {step === 3 && (
          <Q title="Calibrage du volume" sub="Combien de messages recevez-vous par jour ?">
            <Choices items={VOLUMES} value={p.volume} onPick={(v) => set({ volume: v })} grid />
          </Q>
        )}
        {step === 4 && <Q title="Objectif principal de votre agent"><Choices items={GOALS} value={p.goal} onPick={(v) => set({ goal: v })} /></Q>}
        {step === 5 && <Q title="Le ton de votre agent"><Choices items={TONES} value={p.tone} onPick={(v) => set({ tone: v })} /></Q>}
        {step === 6 && (
          <Q title="Raccourcis rapides" sub="Sélectionnez les réponses que votre agent doit maîtriser.">
            <div className="flex flex-wrap gap-2">
              {SHORTCUTS.map((s) => {
                const on = p.shortcuts.includes(s);
                return (
                  <button key={s} data-active={on} className="option-card !rounded-full !px-4 !py-2 text-sm font-semibold"
                    onClick={() => set({ shortcuts: on ? p.shortcuts.filter((x) => x !== s) : [...p.shortcuts, s] })}>
                    {on && <Check className="mr-1 inline h-4 w-4 text-primary" />}{s}
                  </button>
                );
              })}
            </div>
          </Q>
        )}
        {step === 7 && <Summary p={p} />}
      </div>

      {saveError && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Impossible d'enregistrer votre profil : {saveError}</p>}
      <div className="sticky bottom-0 flex gap-3 bg-background/80 py-4 backdrop-blur">
        {step > 1 && <button className="btn-ghost" disabled={saving} onClick={() => setStep(step - 1)} aria-label="Retour"><ArrowLeft className="h-5 w-5" /></button>}
        <button className="btn-neon flex-1" disabled={!canNext || saving} onClick={next}>
          {saving ? <><Loader2 className="h-5 w-5 animate-spin" /> Enregistrement…</> : <>{step === TOTAL ? "Activer mon agent" : "Continuer"} <ArrowRight className="h-5 w-5" /></>}
        </button>
      </div>
    </div>
  );
}

function Q({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl font-bold">{title}</h1>
      {sub && <p className="mt-2 text-muted-foreground">{sub}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Choices({ items, value, onPick, grid }: { items: string[]; value: string; onPick: (v: string) => void; grid?: boolean }) {
  return (
    <div className={grid ? "grid grid-cols-2 gap-3" : "space-y-3"}>
      {items.map((it) => (
        <button key={it} data-active={value === it} onClick={() => onPick(it)} className="option-card flex w-full items-center justify-between font-semibold">
          {it}{value === it && <Check className="h-5 w-5 shrink-0 text-primary" />}
        </button>
      ))}
    </div>
  );
}

function Summary({ p }: { p: Profile }) {
  const lines = [
    `Ravi de vous rencontrer, ${p.name} ! 👋`,
    `J'ai bien noté que ${p.business} évolue dans le secteur « ${p.sector} » et reçoit ${p.volume.toLowerCase()} messages par jour.`,
    `Mon objectif : ${p.goal.toLowerCase()}, avec un ton ${p.tone.toLowerCase()}.`,
    `Je maîtriserai vos raccourcis : ${p.shortcuts.join(", ")}.`,
    "Tout est prêt. On active votre agent ? 🚀",
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= lines.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 300 : 900);
    return () => clearTimeout(t);
  }, [shown, lines.length]);
  return (
    <div>
      <h1 className="text-3xl font-bold">Votre profil</h1>
      <div className="glass mt-6 space-y-3 p-4">
        {lines.slice(0, shown).map((l, i) => (
          <div key={i} className="animate-float-up flex items-start gap-2">
            {i === 0 ? <Bot className="mt-1 h-6 w-6 shrink-0 text-primary" /> : <span className="w-6 shrink-0" />}
            <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-2.5 text-sm">{l}</div>
          </div>
        ))}
        {shown < lines.length && <p className="pl-8 text-sm text-muted-foreground">L'assistant écrit…</p>}
      </div>
    </div>
  );
}
