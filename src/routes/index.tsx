import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Mic, Gift, Star, Clock, Phone, Video } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chatplay — Automatisez votre WhatsApp avec l'IA 24h/24" },
      { name: "description", content: "Chatplay répond à vos clients WhatsApp 24h/24 grâce à l'IA : anti-spam, notes vocales ElevenLabs, essai exclusif." },
      { property: "og:title", content: "Chatplay — Votre WhatsApp en pilote automatique" },
      { property: "og:description", content: "Un agent IA qui répond à vos clients WhatsApp jour et nuit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <Link to="/onboarding" className="btn-neon !px-4 !py-2 text-sm">Lancer l'essai</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <section className="grid items-center gap-12 py-14 md:grid-cols-2 md:py-24">
          <div className="animate-float-up text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent px-4 py-1.5 text-sm text-accent-foreground">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" /> L'agent IA n°1 pour WhatsApp
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Automatisez <span className="neon-underline">votre WhatsApp</span> avec l'IA, <span className="neon-text">24h/24</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Chatplay répond à vos clients instantanément, prend les commandes et envoie même des notes vocales — pendant que vous dormez.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row md:justify-start">
              <Link to="/onboarding" className="btn-neon w-full text-lg sm:w-auto">
                <ArrowRight className="h-5 w-5" /> Commencer maintenant
              </Link>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex text-star">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                <span className="font-bold text-star">4.8/5</span>
                <span className="text-muted-foreground">· +12 000 entreprises</span>
              </div>
            </div>
          </div>
          <PhoneMock />
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, t: "Anti-spam intégré", d: "Limites d'envoi intelligentes et délais humains pour protéger votre numéro." },
            { icon: Mic, t: "Voix ElevenLabs", d: "Votre agent répond aussi en notes vocales ultra-réalistes." },
            { icon: Gift, t: "Essai exclusif", d: "3 jours complets pour seulement 5 $. Sans engagement." },
          ].map(({ icon: I, t, d }) => (
            <div key={t} className="glass p-6">
              <I className="h-7 w-7 text-primary" />
              <h3 className="mt-4 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>

        <section className="glass mb-20 flex flex-col items-center gap-4 p-10 text-center">
          <Clock className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold">Ne ratez plus jamais un client.</h2>
          <Link to="/onboarding" className="btn-neon">Lancer l'essai <ArrowRight className="h-4 w-4" /></Link>
        </section>
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">© 2026 Chatplay</footer>
    </div>
  );
}

function PhoneMock() {
  const msgs = [
    { out: true, t: "Salut ! Vous pouvez me rappeler vos tarifs ?" },
    { out: false, t: "Bonjour 👋 Nos formules débutent à 25 $. Je vous envoie le détail ?" },
    { out: true, t: "Oui, et vous livrez à Kinshasa ?" },
    { out: false, t: "🎙️ Note vocale · 0:12" },
  ];
  return (
    <div className="mx-auto w-full max-w-xs rounded-[2.5rem] border-4 border-secondary bg-card p-3 shadow-[var(--shadow-neon)]">
      <div className="flex items-center gap-3 rounded-t-[2rem] bg-secondary px-4 py-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 font-bold text-primary">A</div>
        <div className="flex-1"><p className="text-sm font-semibold">Agent Chatplay</p><p className="text-xs text-success">En ligne</p></div>
        <Phone className="h-4 w-4 text-muted-foreground" /><Video className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-3 px-2 py-5">
        {msgs.map((m, i) => (
          <div key={i} style={{ animationDelay: `${i * 0.25}s` }}
            className={`animate-float-up max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.out ? "ml-auto rounded-br-sm bg-bubble-out" : "rounded-bl-sm bg-secondary"}`}>
            {m.t}
          </div>
        ))}
      </div>
    </div>
  );
}
