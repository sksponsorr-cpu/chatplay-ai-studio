import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { client, currentUser } from "./db";

export type WaConnection = {
  status: "pending" | "connected" | "disconnected";
  phone_number: string | null;
  qr_code: string | null;
  agent_id: string;
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;
const BACKEND_API_KEY = import.meta.env.VITE_BACKEND_API_KEY as string | undefined;

/** Reusable WhatsApp pairing by agent. */
export function useWhatsAppPairing(agentId?: string) {
  const [conn, setConn] = useState<WaConnection | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const load = useCallback(async () => {
    if (!agentId) {
      setLoading(false);
      return null;
    }
    const user = await currentUser();
    if (!user) throw new Error("vous n'êtes pas connecté");
    const { data, error: err } = await client()
      .from("whatsapp_connections")
      .select("status, phone_number, qr_code, agent_id")
      .eq("agent_id", agentId)
      .maybeSingle();
    if (err) throw new Error(`lecture de la connexion WhatsApp : ${err.message}`);
    setConn((data as WaConnection | null) ?? null);
    return agentId;
  }, [agentId]);

  const subscribe = useCallback(async (aid: string) => {
    channelRef.current?.unsubscribe();
    channelRef.current = client()
      .channel(`wa-conn-${aid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_connections", filter: `agent_id=eq.${aid}` },
        (p) => setConn(p.new as WaConnection),
      )
      .subscribe();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const aid = await load();
        if (active && aid) await subscribe(aid);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [load, subscribe]);

  /** Demande au backend Railway de démarrer une session Baileys pour cet agent. */
  const connect = useCallback(async () => {
    if (!agentId) {
      setError("Aucun agent sélectionné.");
      return;
    }
    if (!BACKEND_URL || !BACKEND_API_KEY) {
      setError("Backend non configuré (VITE_BACKEND_URL / VITE_BACKEND_API_KEY).");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/sessions/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": BACKEND_API_KEY },
        body: JSON.stringify({ session_id: agentId }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Backend a répondu ${res.status} : ${txt || "erreur"}`);
      }
      // Le backend écrit la ligne + le QR dans Supabase. Realtime mettra à jour.
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setConnecting(false);
    }
  }, [agentId, load]);

  const status = conn?.status ?? null;
  const qr = conn?.qr_code ?? "";
  const phone = conn?.phone_number ?? null;
  const stuck = !loading && !!agentId && status !== "connected" && !qr && !connecting;

  return {
    status, qr, phone, error, loading, connecting, connect,
    diagnosis: "", diagnosing: false,
    diagnose: async () => {},
    hasProblem: Boolean(error) || stuck || status === "disconnected",
  };
}
