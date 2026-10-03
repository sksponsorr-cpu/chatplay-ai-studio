import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getProfile, signInEmail, signInGoogle, signUpEmail } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Chatplay" },
      { name: "description", content: "Connectez-vous à Chatplay avec Google ou votre adresse e-mail." },
      { property: "og:title", content: "Connexion — Chatplay" },
      { property: "og:description", content: "Accédez à votre agent WhatsApp IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Signed-in users go straight to the dashboard if onboarding is done, else to onboarding.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const route = async () => {
      const { data } = await sb.auth.getUser();
      if (!data.user) return;
      const p = await getProfile().catch(() => null);
      navigate({ to: p?.onboarding_completed ? "/dashboard" : "/onboarding", replace: true });
    };
    route();
    const { data: sub } = sb.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") route(); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(""); setInfo("");
    try {
      if (mode === "login") await signInEmail(email, password);
      else if (!(await signUpEmail(email, password))) setInfo("Compte créé ! Confirmez votre adresse via le lien reçu par e-mail, puis connectez-vous.");
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur inconnue"); }
    finally { setBusy(false); }
  };

  const google = async () => {
    setError("");
    try { await signInGoogle(); } catch (err) { setError(err instanceof Error ? err.message : "Erreur inconnue"); }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-5">
      <Logo />
      <div className="animate-float-up glass mt-10 p-6">
        <h1 className="text-2xl font-bold">{mode === "signup" ? "Créer votre compte" : "Content de vous revoir"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{mode === "signup" ? "Lancez votre agent WhatsApp IA en 2 minutes." : "Connectez-vous pour accéder à votre tableau de bord."}</p>

        <button className="btn-ghost mt-6 w-full" onClick={google} disabled={busy}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.5-1.7 4.4-5.35 4.4-3.22 0-5.85-2.67-5.85-5.96S8.78 6.56 12 6.56c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 4 14.55 3 12 3 7.03 3 3 7.03 3 12s4.03 9 9 9c5.2 0 8.64-3.65 8.64-8.8 0-.59-.06-1.04-.14-1.1z"/></svg>
          Continuer avec Google
        </button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou par e-mail<span className="h-px flex-1 bg-border" /></div>

        <form onSubmit={submit} className="space-y-3">
          <input className="field" type="email" required placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input className="field" type="password" required minLength={6} placeholder="Mot de passe (6 caractères min.)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {info && <p role="status" className="text-sm text-success">{info}</p>}
          <button className="btn-neon w-full" disabled={busy}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />} {mode === "signup" ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>
        <button className="mt-4 w-full text-center text-sm text-muted-foreground underline" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setInfo(""); }}>
          {mode === "signup" ? "Déjà inscrit ? Se connecter" : "Pas de compte ? S'inscrire"}
        </button>
      </div>
    </div>
  );
}
