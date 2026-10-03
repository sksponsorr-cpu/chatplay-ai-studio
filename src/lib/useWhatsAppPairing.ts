import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getWaSession, requestPairing, watchWaSession, type WaSession } from "./db";
import { diagnoseWhatsApp } from "./diagnose.functions";

const toImg = (qr: string) =>
  qr.startsWith("data:") ? qr : `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qr)}`;

/** Reusable WhatsApp pairing: requests a QR in Supabase, syncs it live, and offers an AI diagnosis on errors. */
export function useWhatsAppPairing() {
  const [status, setStatus] = useState<WaSession["status"]>("pending");
  const [qr, setQr] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosing, setDiagnosing] = useState(false);
  const diagnoseFn = useServerFn(diagnoseWhatsApp);

  const apply = (s: WaSession | null) => {
    if (!s) return;
    setStatus(s.status); setPhone(s.phone);
    setQr(s.qr ? toImg(s.qr) : "");
  };

  const refresh = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      apply(manual ? await requestPairing() : (await getWaSession()) ?? (await requestPairing()));
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur inconnue"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    refresh();
    let ch: { unsubscribe: () => void } | null = null;
    watchWaSession(apply).then((c) => { ch = c; }).catch((e) => setError(e instanceof Error ? e.message : "temps réel indisponible"));
    return () => { ch?.unsubscribe(); };
  }, [refresh]);

  const diagnose = useCallback(async () => {
    setDiagnosing(true); setDiagnosis("");
    try {
      const r = await diagnoseFn({ data: { error: error || "QR code non reçu", status, context: qr ? "QR affiché mais non validé" : "aucun QR reçu" } });
      setDiagnosis(r.message);
    } catch { setDiagnosis("Diagnostic indisponible pour le moment."); }
    finally { setDiagnosing(false); }
  }, [diagnoseFn, error, status, qr]);

  // A session stuck without QR also counts as a problem worth diagnosing.
  const stuck = !loading && status !== "connected" && !qr;
  return { status, qr, phone, error, loading, refreshing, refresh, diagnose, diagnosis, diagnosing, hasProblem: Boolean(error) || stuck || status === "disconnected" };
}
