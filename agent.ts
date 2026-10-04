/** Agent (studio) : types, listes de choix, lecture / écriture Supabase et test via la fonction « agent-chat ». */
import { client, currentUser } from "./db";

export type KnowledgeItem = { title: string; content: string };
export type ProductItem = { name: string; price: string; description: string };
export type ChatMsg = { role: "user" | "assistant"; content: string };

export type AgentFull = {
  id: string;
  name: string;
  instructions: string;
  voice_enabled: boolean;
  voice: string;
  status: "online" | "draft";
  model: string;
  temperature: number;
  max_tokens: number;
  welcome_message: string;
  knowledge: KnowledgeItem[];
  products: ProductItem[];
  settings: { tone: string; language: string };
};

/** Les identifiants sont ceux de fal.ai (OpenRouter). La même liste doit exister dans la fonction « agent-chat ». */
export const MODELS = [
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", badge: "Recommandé", desc: "Rapide et économique" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o mini", badge: "Économique", desc: "Léger et rapide" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", badge: "Premium", desc: "Plus précis" },
  { id: "openai/gpt-4o", name: "GPT-4o", badge: "Premium", desc: "Très polyvalent" },
  { id: "openai/gpt-5-chat", name: "GPT-5", badge: "Premium", desc: "Dernière génération" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", badge: "Premium", desc: "Excellent en rédaction" },
];
export const DEFAULT_MODEL = "google/gemini-2.5-flash";

export const TONES = [
  { id: "normal", name: "Normal", desc: "Ton équilibré et naturel" },
  { id: "amical", name: "Amical", desc: "Chaleureux et détendu" },
  { id: "professionnel", name: "Professionnel", desc: "Formel et précis" },
  { id: "commercial", name: "Commercial", desc: "Persuasif et vendeur" },
];

export const LANGUAGES = [
  { id: "auto", name: "Automatique (langue du client)" },
  { id: "fr", name: "Français" },
  { id: "en", name: "Anglais" },
  { id: "ar", name: "Arabe" },
];

export const TEMPLATES = [
  {
    name: "Support client",
    text: `Tu es l'assistant du service client d'une boutique en ligne. Tu réponds aux questions sur les commandes, la livraison, les retours et les produits.
Règles :
- Réponds en 2 à 4 phrases maximum, avec un ton chaleureux.
- Pose une seule question à la fois si tu as besoin d'une précision.
- Si tu ne connais pas la réponse, dis-le et propose de passer la main à un humain.`,
  },
  {
    name: "Vendeur",
    text: `Tu es un conseiller de vente sur WhatsApp. Ton but est d'aider le client à choisir un produit et de l'amener à commander.
Règles :
- Pose des questions pour comprendre son besoin, puis recommande 1 ou 2 produits maximum.
- Donne les prix exacts de la liste de produits, sans jamais en inventer.
- Termine par une question simple qui fait avancer vers la commande.`,
  },
  {
    name: "Prise de rendez-vous",
    text: `Tu es l'assistant qui prend les rendez-vous de l'entreprise.
Règles :
- Demande le nom du client, le service souhaité, le jour et l'heure préférés.
- Récapitule le rendez-vous avant de le confirmer.
- Ne promets jamais un créneau que tu ne peux pas vérifier : indique qu'un membre de l'équipe confirmera.`,
  },
  {
    name: "Restaurant",
    text: `Tu es l'assistant WhatsApp d'un restaurant. Tu présentes le menu, prends les commandes et les réservations.
Règles :
- Réponds brièvement et avec le sourire.
- Pour une commande, demande l'adresse ou le retrait sur place, puis récapitule le total.
- Pour une réservation, demande la date, l'heure et le nombre de personnes.`,
  },
];

export function newAgent(): AgentFull {
  return {
    id: crypto.randomUUID(),
    name: "Mon agent",
    instructions: TEMPLATES[0]?.text ?? "",
    voice_enabled: false,
    voice: "Sarah",
    status: "draft",
    model: DEFAULT_MODEL,
    temperature: 0.6,
    max_tokens: 400,
    welcome_message: "",
    knowledge: [],
    products: [],
    settings: { tone: "normal", language: "auto" },
  };
}

function normalize(r: Record<string, unknown>): AgentFull {
  const s = (r["settings"] ?? {}) as Record<string, unknown>;
  const model = String(r["model"] ?? "");
  return {
    id: String(r["id"]),
    name: String(r["name"] ?? "Mon agent"),
    instructions: String(r["instructions"] ?? ""),
    voice_enabled: Boolean(r["voice_enabled"]),
    voice: String(r["voice"] ?? "Sarah"),
    status: r["status"] === "online" ? "online" : "draft",
    model: MODELS.some((m) => m.id === model) ? model : DEFAULT_MODEL,
    temperature: Number(r["temperature"] ?? 0.6),
    max_tokens: Number(r["max_tokens"] ?? 400),
    welcome_message: String(r["welcome_message"] ?? ""),
    knowledge: Array.isArray(r["knowledge"]) ? (r["knowledge"] as KnowledgeItem[]) : [],
    products: Array.isArray(r["products"]) ? (r["products"] as ProductItem[]) : [],
    settings: { tone: String(s["tone"] ?? "normal"), language: String(s["language"] ?? "auto") },
  };
}

/** Renvoie l'agent le plus récent de l'utilisateur, ou null s'il n'en a pas encore. */
export async function getMyAgent(): Promise<AgentFull | null> {
  const user = await currentUser();
  if (!user) throw new Error("vous n'êtes pas connecté");
  const { data, error } = await client()
    .from("agents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`lecture de l'agent : ${error.message}`);
  return data ? normalize(data as Record<string, unknown>) : null;
}

export async function saveAgent(a: AgentFull): Promise<void> {
  const user = await currentUser();
  if (!user) throw new Error("vous n'êtes pas connecté");
  const { error } = await client()
    .from("agents")
    .upsert({ ...a, user_id: user.id, updated_at: new Date().toISOString() });
  if (error) {
    const hint = /column|schema cache/i.test(error.message)
      ? " — la table « agents » doit être mise à jour : lancez le SQL de mise à jour dans Supabase."
      : "";
    throw new Error(`enregistrement de l'agent : ${error.message}${hint}`);
  }
}

/** Envoie la conversation de test à la fonction Supabase « agent-chat » (la clé fal.ai reste côté serveur). */
export async function sendTestMessage(a: AgentFull, messages: ChatMsg[]): Promise<string> {
  const { data, error } = await client().functions.invoke("agent-chat", {
    body: {
      messages,
      instructions: a.instructions,
      tone: a.settings.tone,
      language: a.settings.language,
      knowledge: a.knowledge,
      products: a.products,
      model: a.model,
      temperature: a.temperature,
      max_tokens: a.max_tokens,
    },
  });
  if (error) {
    let detail = "";
    try {
      const ctx = (error as { context?: Response }).context;
      const body = ctx ? await ctx.clone().json() : null;
      detail = [body?.error, body?.detail].filter(Boolean).join(" — ");
    } catch { /* corps non JSON */ }
    throw new Error(detail || error.message);
  }
  const reply = (data as { reply?: string } | null)?.reply;
  if (!reply) throw new Error("réponse vide");
  return reply;
}
