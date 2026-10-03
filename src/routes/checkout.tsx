import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, CreditCard, Lock, Smartphone, Star, X, Gift } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AuthGate } from "@/components/AuthGate";
import { loadProfile } from "@/lib/api";
import { startTrialPayment } from "@/lib/db";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Essai exclusif 3 jours pour 5 $ — Chatplay" },
      { name: "description", content: "Activez votre agent WhatsApp IA : 3 jours pour 5 $ via Mobile Money ou carte (SwyChr)." },
      { property: "og:title", content: "Essai Chatplay : 3 jours pour 5 $" },
      { property: "og:description", content: "Paiement sécurisé Mobile Money et carte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthGate><Checkout /></AuthGate>,
});

const REVIEWS = [
  { n: "Grâce M.", r: "Boutique mode", t: "Mon agent répond la nuit et j'ai doublé mes commandes en une semaine." },
  { n: "Patrick K.", r: "Restaurant", t: "Les notes vocales bluffent mes clients. Installation en 5 minutes." },
  { n: "Aïcha D.", r: "Salon de beauté", t: "Fini les rendez-vous ratés. Rentabilisé dès le 2e jour." },
];

function Checkout() {
  const [method, setMethod] = useState<"mobile_money" | "card">("mobile_money");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exitOpen, setExitOpen] = useState(false);
  const shown = useRef(false);
  const paying = useRef(false);

  // Anti-churn: exit intent (desktop mouse leave + mobile back button)
  useEffect(() => {
    const trigger = () => { if (!shown.current && !paying.current) { shown.current = true; setExitOpen(true); } };
    const onMouse = (e: MouseEvent) => { if (e.clientY <= 0) trigger(); };
    history.pushState({ chatplayTrap: true }, "");
    const onPop = () => { if (!shown.current) { history.pushState({ chatplayTrap: true }, ""); trigger(); } else history.back(); };
    const onBefore = (e: BeforeUnloadEvent) => { if (!paying.current) { e.preventDefault(); } };
    document.addEventListener("mouseout", onMouse);
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", onBefore);
    return () => { document.removeEventListener("mouseout", onMouse); window.removeEventListener("popstate", onPop); window.removeEventListener("beforeunload", onBefore); };
  }, []);

  const pay = async () => {
    setError(""); setLoading(true); paying.current = true;
    try {
      const p = loadProfile();
      const url = await startTrialPayment({ email, phone, name: p.name ?? "", method });
      window.location.href = url;
    } catch (e) {
      paying.current = false;
      setError(e instanceof Error ? e.message : "Paiement impossible");
    } finally { setLoading(false); }
  };

  const valid = /\S+@\S+\.\S+/.test(email) && (method === "card" || phone.replace(/\D/g, "").length >= 9);

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <div className="flex items-center justify-between"><Logo /><span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Paiement sécurisé</span></div>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <div className="glass relative overflow-hidden p-6 shadow-[var(--shadow-neon)]">
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">Offre exclusive</span>
          <h1 className="mt-4 text-3xl font-extrabold">Essai complet de 3 jours</h1>
          <div className="mt-4 flex items-end gap-3">
            <span className="neon-text font-display text-6xl font-extrabold">5 $</span>
            <span className="pb-2 text-lg text-muted-foreground line-through">49 $/mois</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Puis 49 $/mois. Annulable à tout moment.</p>
          <ul className="mt-6 space-y-3 text-sm">
            {["Agent IA WhatsApp actif 24h/24", "Notes vocales ElevenLabs", "Protection anti-spam avancée", "Raccourcis & réponses illimités", "Support prioritaire"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{f}</li>
            ))}
          </ul>
        </div>

        <div className="glass p-6">
          <h2 className="text-xl font-bold">Moyen de paiement</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button data-active={method === "mobile_money"} onClick={() => setMethod("mobile_money")} className="option-card text-center text-sm font-semibold"><Smartphone className="mx-auto mb-1 h-5 w-5 text-primary" />Mobile Money</button>
            <button data-active={method === "card"} onClick={() => setMethod("card")} className="option-card text-center text-sm font-semibold"><CreditCard className="mx-auto mb-1 h-5 w-5 text-primary" />Carte bancaire</button>
          </div>
          <input className="field mt-4" type="email" placeholder="Votre e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          {method === "mobile_money" && <input className="field mt-3" type="tel" placeholder="Numéro Mobile Money (+243…)" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <button className="btn-neon mt-5 w-full text-lg" disabled={!valid || loading} onClick={pay}>
            {loading ? "Redirection…" : "Démarrer mon essai à 5 $"}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Paiement traité par SwyChr · Orange, M-Pesa, Airtel, Visa, Mastercard</p>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-center gap-2">
          <div className="flex text-star">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-5 w-5 fill-current" />)}</div>
          <span className="font-bold text-star">4.8/5</span><span className="text-sm text-muted-foreground">· 2 300 avis</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <div key={r.n} className="glass p-5">
              <div className="flex text-star">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</div>
              <p className="mt-3 text-sm">« {r.t} »</p>
              <p className="mt-3 text-sm font-semibold">{r.n} <span className="font-normal text-muted-foreground">· {r.r}</span></p>
            </div>
          ))}
        </div>
      </section>
      <p className="mt-8 text-center text-sm"><Link to="/dashboard" className="text-muted-foreground underline">Déjà client ? Accéder au tableau de bord</Link></p>

      {exitOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="glass animate-float-up relative w-full max-w-sm p-6 text-center shadow-[var(--shadow-neon)]">
            <button className="absolute right-3 top-3 text-muted-foreground" onClick={() => setExitOpen(false)} aria-label="Fermer"><X className="h-5 w-5" /></button>
            <Gift className="mx-auto h-10 w-10 text-primary" />
            <h3 className="mt-3 text-2xl font-bold">Attendez !</h3>
            <p className="mt-2 text-muted-foreground">Votre agent est déjà configuré. Pendant ce temps, vos clients attendent une réponse… Pour <b className="text-foreground">5 $ seulement</b>, laissez l'IA s'en charger pendant 3 jours.</p>
            <button className="btn-neon mt-5 w-full" onClick={() => setExitOpen(false)}>Je garde mon essai à 5 $</button>
            <Link to="/" className="mt-3 block text-sm text-muted-foreground underline">Non merci, je perds mon offre</Link>
          </div>
        </div>
      )}
    </div>
  );
}
