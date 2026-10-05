import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  error: z.string().max(1000),
  status: z.string().max(40),
  context: z.string().max(500).optional(),
});

/** Asks the AI Gateway for a short, plain-French fix for a WhatsApp pairing problem. */
export const diagnoseWhatsApp = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, message: "Assistant de diagnostic non configuré." };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "Tu es le support de Chatplay, une app qui relie WhatsApp à un agent IA via un QR code stocké dans la table whatsapp_connections (colonnes user_id, status, qr_code, phone_number). La fonction whatsapp-connect- lance la connexion et écrit le QR. Réponds en français simple, pour un non-technicien, en 3 à 5 étapes numérotées courtes. Maximum 90 mots.",
        input: `Statut: ${data.status}\nErreur: ${data.error}\nContexte: ${data.context ?? "aucun"}`,
      }),
    });
    if (!res.ok || !res.body) {
      const msg = res.status === 402 ? "Crédits IA épuisés — ajoutez des crédits pour utiliser le diagnostic."
        : res.status === 429 ? "Trop de demandes, réessayez dans une minute."
        : `Diagnostic indisponible (code ${res.status}).`;
      return { ok: false as const, message: msg };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(l.slice(5).trim());
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "response.refusal.delta" || ev.type === "error") return { ok: false as const, message: "Le diagnostic n'a pas pu être généré." };
        } catch { /* partial / non-JSON */ }
      }
    }
    return text.trim() ? { ok: true as const, message: text.trim() } : { ok: false as const, message: "Aucune réponse du diagnostic." };
  });
