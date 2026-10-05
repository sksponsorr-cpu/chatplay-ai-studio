/** test-api.ts — Envoie un message de test à la fonction Supabase agent-chat */
import { getSupabase } from "./supabase";

export type TestReply = { reply: string };

export async function sendTestMessage(
  sessionId: string,
  message: string,
  model: string,
  systemPrompt: string,
): Promise<TestReply> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase non configuré");

  try {
    const { data, error } = await sb.functions.invoke("agent-chat", {
      body: {
        messages: [{ role: "user", content: message }],
        model,
        instructions: systemPrompt || "Tu es un assistant WhatsApp poli et concis.",
        temperature: 0.6,
        max_tokens: 400,
        knowledge: [],
        products: [],
        settings: { tone: "normal", language: "auto" },
      },
    });

    if (error) {
      console.error("[sendTestMessage error]", error);
      const detail = (error as any)?.context?.message || error.message;
      throw new Error(detail || "Erreur lors de l'appel à agent-chat");
    }

    if (!data || typeof data.reply !== "string") {
      throw new Error("Réponse invalide de la fonction");
    }

    return { reply: data.reply };
  } catch (e) {
    console.error("[sendTestMessage]", e);
    throw e;
  }
}
