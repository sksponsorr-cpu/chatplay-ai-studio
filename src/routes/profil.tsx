import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, User, Mail, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AuthGate } from "@/components/AuthGate";
import { getSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — Chatplay" },
      { name: "description", content: "Gérez votre profil Chatplay." },
    ],
  }),
  component: () => <AuthGate><ProfilPage /></AuthGate>,
});

function ProfilPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      const client = getSupabase();
      if (!client) { setLoading(false); return; }
      try {
        const { data } = await client.auth.getUser();
        if (data?.user) {
          setEmail(data.user.email || "");
          setName(
            (data.user.user_metadata?.name as string) ||
              (data.user.email ? data.user.email.split("@")[0] : "") ||
              "",
          );
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveName = async () => {
    const client = getSupabase();
    if (!client) return;
    await client.auth.updateUser({ data: { name } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const logout = async () => {
    setLoggingOut(true);
    const client = getSupabase();
    if (client) await client.auth.signOut();
    nav({ to: "/auth" });
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <Logo />
        <Link to="/dashboard" className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Tableau de bord
        </Link>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-600 text-3xl font-bold">
            {(name || "U").charAt(0).toUpperCase()}
          </div>
          <h1 className="mt-4 text-2xl font-bold">{name || "Utilisateur"}</h1>
          <p className="text-sm text-neutral-400">{email}</p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-green-500" /> Nom affiché
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-green-500"
              placeholder="Votre nom"
            />
          </div>

          <div>
            <label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-green-500" /> Adresse email
            </label>
            <input
              value={email}
              disabled
              className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl px-4 py-3 outline-none text-neutral-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-neutral-500">
              L'email ne peut pas être modifié pour le moment.
            </p>
          </div>

          <button
            onClick={saveName}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold flex items-center justify-center gap-2 transition"
          >
            {saved ? (<><CheckCircle2 className="h-4 w-4" /> Enregistré !</>) : "Enregistrer"}
          </button>
        </div>

        <button
          onClick={logout}
          disabled={loggingOut}
          className="w-full py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {loggingOut ? "Déconnexion…" : "Se déconnecter"}
        </button>
      </div>
    </div>
  );
}
