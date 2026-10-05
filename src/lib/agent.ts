import { getSupabase } from "./supabase";

export type AgentConfig = {
  id: string;
  name: string;
  instructions: string;
  model: string;
  temperature: number;
  max_tokens: number;
  voice_enabled: boolean;
  voice: string;
  knowledge: Array<{ title: string; content: string }>;
  products: Array<{ name: string; price: string; description: string }>;
  settings: { tone?: string; language?: string };
};

export const MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini Flash (gratuit)" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "google/gemini-2.5-pro", label: "Gemini Pro" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-5-chat", label: "GPT-5" },
  { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet" },
];

export const TONES = [
  { value: "normal", label: "Normal" },
  { value: "amical", label: "Amical" },
  { value: "professionnel", label: "Professionnel" },
  { value: "commercial", label: "Commercial" },
];

export const LANGUAGES = [
  { value: "auto", label: "Auto-détection" },
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

export const TEMPLATES = [
  {
    name: "Assistant client",
    instructions:
      "Tu es un assistant client poli et professionnel. Tu aides les clients avec leurs questions et leurs commandes. Si tu ne sais pas, propose de les transférer à un humain.",
  },
  {
    name: "Vendeur",
    instructions:
      "Tu es un vendeur enthousiaste et persuasif. Tu présentes les produits de manière attrayante, réponds aux objections et facilites les ventes sans être insistant.",
  },
  {
    name: "Support technique",
    instructions:
      "Tu es un expert technique patient. Tu aides les clients à résoudre leurs problèmes techniquement. Tu vas droit au but et offres des solutions claires.",
  },
  {
    name: "Prise de rendez-vous",
    instructions:
      "Tu es un assistant de planification efficace. Tu aides à prendre des rendez-vous, vérifies la disponibilité et confirmes les détails clairement.",
  },
];

export async function getMyAgent(agentId: string): Promise<AgentConfig | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from("agents")
      .select(
        "id, name, instructions, model, temperature, max_tokens, voice_enabled, voice, knowledge, products, settings"
      )
      .eq("id", agentId)
      .maybeSingle();

    if (error) throw error;
    return data as AgentConfig | null;
  } catch (e) {
    console.error("[getMyAgent]", e);
    return null;
  }
}

export async function saveAgent(agentId: string, config: Partial<AgentConfig>) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase non configuré");

  try {
    const { error } = await sb
      .from("agents")
      .update({
        ...config,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId);

    if (error) throw error;
  } catch (e) {
    console.error("[saveAgent]", e);
    throw e;
  }
}

export async function sendTestMessage(
  message: string,
  agentConfig: Partial<AgentConfig>
): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase non configuré");

  try {
    const { data, error } = await sb.functions.invoke("agent-chat", {
      body: {
        messages: [{ role: "user", content: message }],
        model: agentConfig.model || "google/gemini-2.5-flash",
        instructions: agentConfig.instructions || "",
        temperature: agentConfig.temperature || 0.6,
        max_tokens: agentConfig.max_tokens || 400,
        knowledge: agentConfig.knowledge || [],
        products: agentConfig.products || [],
        settings: agentConfig.settings || {},
      },
    });

    if (error) {
      console.error("[sendTestMessage error]", error);
      throw new Error(error.message || "Erreur lors de l'appel à la fonction");
    }

    if (!data || !data.reply) {
      throw new Error("Pas de réponse reçue");
    }

    return data.reply;
  } catch (e) {
    console.error("[sendTestMessage]", e);
    throw e;
  }
}
