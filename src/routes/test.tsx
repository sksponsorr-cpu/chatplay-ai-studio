import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Bot, Settings } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { sendTestMessage } from "@/lib/test-api";

export const Route = createFileRoute("/test")({
  component: TestPage,
});

type Message = { role: "user" | "assistant"; content: string };

function TestPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("gemini-2.0-flash");

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendTestMessage("test-session", userMsg.content, model, "");
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `❌ ${e.message || "Erreur"}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col pb-20">
      <div className="border-b border-neutral-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <div className="font-semibold">Customer Assistant</div>
            <div className="text-xs text-green-400">● En ligne</div>
          </div>
        </div>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1 text-sm"
        >
          <option value="gemini-2.0-flash">Gemini Flash (gratuit)</option>
          <option value="google/gemini-2.5-flash">Gemini 2.5 (fal.ai)</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-neutral-500 mt-20">
            <div className="text-lg font-semibold text-white mb-2">Testez Customer ici</div>
            <div className="text-sm">Commencez par envoyer un message</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                m.role === "user" ? "bg-green-600" : "bg-neutral-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 px-4 py-2 rounded-2xl text-neutral-400">…</div>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-800 p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message"
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-full px-4 py-2 outline-none focus:border-green-500"
        />
        <button
          onClick={send}
          disabled={loading}
          className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
