"use client";

import { useEffect, useRef, useState } from "react";

import { getToken } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { askAi } from "@/lib/queries/executive";

type Msg = { role: "user" | "ai"; text: string };

const QUICK_ES = [
  "¿Quién está atascado en el onboarding?",
  "¿Qué agentes no iniciaron el path?",
  "¿Cuántos cerré el primer cliente este mes?",
  "¿Qué etapa tiene más retrasos?",
  "Resumí la semana del equipo",
];
const QUICK_EN = [
  "Who is stuck in onboarding?",
  "Which agents haven't started the path?",
  "How many closed their first client this month?",
  "Which stage has the most delays?",
  "Summarize the team's week",
];

export default function ChatPage() {
  const { locale } = useLocale();
  const es = locale === "es";
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getToken()) { window.location.href = "/login"; }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setThinking(true);
    const res = await askAi(q, locale).catch(() => ({ answer: es ? "Error al procesar la consulta." : "Error processing the query.", source: "error" }));
    setMsgs((m) => [...m, { role: "ai", text: res.answer }]);
    setThinking(false);
  }

  const quickList = es ? QUICK_ES : QUICK_EN;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      {/* Header */}
      <div className="border-b border-line bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-ink">💬 {es ? "Chat IA" : "AI Chat"}</h1>
        <p className="text-xs text-muted">
          {es ? "Consultá sobre el onboarding, el equipo o cualquier dato de la plataforma." : "Ask about onboarding, the team, or any platform data."}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8">
        {msgs.length === 0 && (
          <div className="mb-6 text-center">
            <p className="mb-4 text-sm text-muted">
              {es ? "¿Qué querés saber?" : "What would you like to know?"}
            </p>
            <div className="mx-auto flex max-w-lg flex-wrap justify-center gap-2">
              {quickList.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm text-muted shadow-card transition hover:border-brand hover:text-brand"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-2xl space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "ai" && (
                <div className="mr-2 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm">🧠</div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-brand text-white rounded-br-sm"
                    : "bg-white border border-line text-ink shadow-card rounded-bl-sm"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="mr-2 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-sm">🧠</div>
              <div className="rounded-2xl rounded-bl-sm border border-line bg-white px-4 py-3 text-sm text-muted shadow-card">
                <span className="animate-pulse">{es ? "Pensando…" : "Thinking…"}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-line bg-white px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder={es ? "Escribí tu consulta…" : "Type your question…"}
            disabled={thinking}
            className="flex-1 rounded-xl border border-line bg-soft px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={thinking || !input.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-card transition hover:opacity-90 disabled:opacity-40"
          >
            ➤
          </button>
        </div>
        {msgs.length > 0 && (
          <div className="mx-auto mt-2 max-w-2xl flex flex-wrap gap-1.5">
            {quickList.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-brand hover:text-brand"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
