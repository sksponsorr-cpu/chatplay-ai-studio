import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { client, currentUser } from "./db";
import { diagnoseWhatsApp } from "./diagnose.functions";

export type WaConnection = {
  status: "pending" | "connected" | "disconnected";
  phone_number: string | null;
  qr_code: string | null;
  user_id: string;
};

/** Connexion WhatsApp réelle : Edge Function, ligne utilisateur et mises à jour Realtime. */
export function useWhatsAppPairing(agentId?: string) {
  const [conn, setConn] = useState<WaConnection | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosing, setDiagnosing] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const diagnoseFn = useServerFn(diagnoseWhatsApp);

  const load = useCallback(async () => {
    const user = await currentUser();
    if (!user) throw new Error("Vous n’êtes pas connecté.");
    const { data, error: readError } = await client()
      .from("whatsapp_connections")
      .select("status, phone_number, qr_code, user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) throw new Error(`Lecture de la connexion WhatsApp : ${readError.message}`);
    setConn((data as WaConnection | null) ?? null);
    return user.id;
  }, []);

  const subscribe = useCallback((userId: string) => {
    void channelRef.current?.unsubscribe();
    channelRef.current = client()
      .channel(`wa-connection-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_connections", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setConn(null);
            return;
          }
          setConn(payload.new as WaConnection);
          setError("");
        },
      )
      .subscribe();
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const userId = await load();
        if (active) subscribe(userId);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Erreur inconnue");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      void channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [load, subscribe]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError("");
    setDiagnosis("");
    try {
      const { data, error: functionError } = await client().functions.invoke("whatsapp-connect-", {
        body: agentId ? { agent_id: agentId } : {},
      });
      if (functionError) {
        const details = typeof data === "object" && data && "message" in data ? String(data.message) : functionError.message;
        throw new Error(details || "La fonction de connexion WhatsApp a échoué.");
      }
      if (data && typeof data === "object" && "error" in data && data.error) {
        const details = "message" in data ? String(data.message) : String(data.error);
        throw new Error(details);
      }
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erreur inconnue";
      setError(message.includes("db_error")
        ? "La connexion n’a pas pu être enregistrée. Vérifiez les journaux de la fonction whatsapp-connect-."
        : message);
    } finally {
      setConnecting(false);
    }
  }, [agentId, load]);

  const diagnose = useCallback(async () => {
    setDiagnosing(true);
    setDiagnosis("");
    try {
      const result = await diagnoseFn({
        data: {
          error: error || "Le QR code n’arrive pas",
          status: conn?.status ?? "aucune connexion",
          context: agentId ? `Agent ${agentId}` : "Tableau de bord",
        },
      });
      setDiagnosis(result.message);
    } catch (cause) {
      setDiagnosis(cause instanceof Error ? cause.message : "Diagnostic indisponible.");
    } finally {
      setDiagnosing(false);
    }
  }, [agentId, conn?.status, diagnoseFn, error]);

  const status = conn?.status ?? null;
  const qr = conn?.qr_code ?? "";
  const phone = conn?.phone_number ?? null;
  const stuck = !loading && status === "pending" && !qr && !connecting;

  return {
    status, qr, phone, error, loading, connecting, connect,
    diagnosis, diagnosing, diagnose,
    hasProblem: Boolean(error) || stuck || status === "disconnected",
  };
}