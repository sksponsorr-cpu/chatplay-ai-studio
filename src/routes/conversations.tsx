import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Search, MessageSquare, Bot, User, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AuthGate } from "@/components/AuthGate";
import { listConversations, type ConversationRow } from "@/lib/db";

export const Route = createFileRoute("/conversations")({
  head: () => ({
    meta: [{ title: "Conversations — Chatplay" }],
  }),
  component: () => <AuthGate><ConversationsPage /></AuthGate>,
});

function ConversationsPage() {
  const nav = useNavigate();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listConversations();
      setConversations(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = conversations.filter((c) =>
    (c.contact_name || c.contact_phone).toLowerCase().includes(search.toLowerCase()),
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-24">
      <div className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-sm text-neutral-400">Conversations</span>
        </div>
        <Link to="/dashboard" className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="w-full flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 mb-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-green-600/20 text-green-500">
            <Bot className="h-5 w-5" />
          </span>
          <span className="flex-1 text-left font-semibold">Customer Support</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 py-3 text-center">
            <div className="flex items-center justify-center gap-1 text-neutral-400 text-xs mb-1">
              <User className="h-3.5 w-3.5" /> Contacts
            </div>
            <div className="font-bold">{conversations.length}</div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 py-3 text-center">
            <div className="flex items-center justify-center gap-1 text-neutral-400 text-xs mb-1">
              <Bot className="h-3.5 w-3.5" /> Agents
            </div>
            <div className="font-bold">1</div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 py-3 text-center">
            <div className="flex items-center justify-center gap-1 text-neutral-400 text-xs mb-1">
              <MessageSquare className="h-3.5 w-3.5" /> Messages
            </div>
            <div className="font-bold">{conversations.length * 2}</div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation…"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-11 pr-4 py-3 outline-none focus:border-green-500"
          />
        </div>

        {loading && (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 p-4 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              {error}
              <button className="block font-bold underline mt-1" onClick={load}>Réessayer</button>
            </div>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 text-neutral-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-neutral-400 mb-1">Aucune conversation</p>
            <p className="text-sm">
              Envoie un message WhatsApp à ton bot pour voir apparaître les conversations ici.
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="w-full flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green-600/20 text-green-500 font-bold">
                  {(c.contact_name || c.contact_phone).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold truncate">
                      {c.contact_name || c.contact_phone}
                    </span>
                    <span className="text-xs text-neutral-500 shrink-0">
                      {formatTime(c.last_message_at)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 truncate">
                    {c.last_message || "…"}
                  </p>
                </div>
                {c.unread_count > 0 && (
                  <span className="shrink-0 grid h-5 min-w-5 px-1.5 place-items-center rounded-full bg-green-600 text-xs font-bold">
                    {c.unread_count}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation basse */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="max-w-3xl mx-auto flex justify-around py-2">
          <Link to="/dashboard" className="flex flex-col items-center gap-0.5 px-4 py-1 text-neutral-500 hover:text-white">
            <Bot className="h-5 w-5" />
            <span className="text-[10px]">Dashboard</span>
          </Link>
          <Link to="/configuration" className="flex flex-col items-center gap-0.5 px-4 py-1 text-neutral-500 hover:text-white">
            <User className="h-5 w-5" />
            <span className="text-[10px]">Agents</span>
          </Link>
          <Link to="/conversations" className="flex flex-col items-center gap-0.5 px-4 py-1 text-green-500">
            <MessageSquare className="h-5 w-5" />
            <span className="text-[10px]">Conversations</span>
          </Link>
        </div>
      </div>
    </div>
  );
            }
