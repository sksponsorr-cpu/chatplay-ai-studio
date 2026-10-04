// test-api.ts — Envoie un message de test à l'agent (sans passer par WhatsApp)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;
const BACKEND_API_KEY = import.meta.env.VITE_BACKEND_API_KEY as string | undefined;

export type TestReply = { reply: string };

export async function sendTestMessage(
  sessionId: string,
  message: string,
  model: string,
  systemPrompt: string,
): Promise<TestReply> {
  if (!BACKEND_URL) throw new Error("VITE_BACKEND_URL manquant dans .env");
  if (!BACKEND_API_KEY) throw new Error("VITE_BACKEND_API_KEY manquant dans .env");

  const res = await fetch(`${BACKEND_URL}/test-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": BACKEND_API_KEY,
    },
    body: JSON.stringify({ session_id: sessionId, message, model, system_prompt: systemPrompt }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Erreur backend (${res.status}) : ${err || "inconnue"}`);
  }

  return (await res.json()) as TestReply;
}
