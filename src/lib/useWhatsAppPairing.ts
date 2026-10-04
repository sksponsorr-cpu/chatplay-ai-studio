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

/** Reusable WhatsApp pairing: invokes the `whatsapp-connect-` Edge Function, then reads and
 *  live-syncs the user's `whatsapp_connections` row. The QR code is only ever displayed from
 *  the `qr_code` column — never generated locally. */
export function useWhatsAppPairing() {
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
    if (!user) throw new Error("vous n'êtes pas connecté");
    const { data, error: err } = await client()
      .from("whatsapp_connections")
      .select("status, phone_number, qr_code, user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (err) throw new Error(`lecture de la connexion WhatsApp : ${err.message}`);
    setConn((data as WaConnection | null) ?? null);
    return user.id;
  }, []);

  const subscribe = useCallback(async (userId: string) => {
    channelRef.current?.unsubscribe();
    channelRef.current = client()
      .channel(`wa-conn-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_connections", filter: `user_id=eq.${userId}` },
        (p) => setConn(p.new as WaConnection),
      )
      .subscribe();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const userId = await load();
        if (active) await subscribe(userId);
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

  /** « Connecter WhatsApp » / « Réessayer » : asks the backend to start a session and write the QR. */
  const connect = useCallback(async () => {
    setConnecting(true);
    setError("");
    try {
      const { error: fnErr } = await client().functions.invoke("whatsapp-connect-", { body: {} });
      if (fnErr) {
        let code = "";
        try {
          const ctx = (fnErr as { context?: Response }).context;
          const body = ctx ? await ctx.clone().json() : null;
          code = body?.error ?? "";
        } catch { /* body not JSON */ }
        if (code === "db_error") {
          throw new Error(
            "le serveur n'a pas pu enregistrer la connexion dans la base (table whatsapp_connections absente ou mal configurée).",
          );
        }
        throw new Error(`connexion WhatsApp : ${code || fnErr.message}`);
      }
      // The function writes the row; refresh immediately in case realtime is slow.
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setConnecting(false);
    }
  }, [load]);

  const diagnose = useCallback(async () => {
    setDiagnosing(true);
    setDiagnosis("");
    try {
      const r = await diagnoseFn({
        data: {
          error: error || "QR code non reçu",
          status: conn?.status ?? "aucune ligne",
          context: conn?.qr_code ? "QR affiché mais non validé" : "aucun QR reçu",
        },
      });
      setDiagnosis(r.message);
    } catch {
      setDiagnosis("Diagnostic indisponible pour le moment.");
    } finally {
      setDiagnosing(false);
    }
  }, [diagnoseFn, error, conn]);

  const status = conn?.status ?? null;
  const qr = conn?.qr_code ?? "";
  const phone = conn?.phone_number ?? null;
  // A pending session without a QR yet also counts as a problem worth diagnosing.
  const stuck = !loading && status !== "connected" && !qr && !connecting;
  return {
    status, qr, phone, error, loading, connecting, connect, diagnose, diagnosis, diagnosing,
    hasProblem: Boolean(error) || stuck || status === "disconnected",
  };
}
