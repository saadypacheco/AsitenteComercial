"use client";

// MENSAJES — feed de lo capturado en WhatsApp (texto, audios transcritos, imágenes).
// Filtros por tipo + búsqueda en mensajes y transcripciones.
import { useEffect, useState } from "react";

import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";
import { getMensajes, type Mensaje } from "@/lib/queries/gestion";

const FILTERS = ["all", "text", "audio", "image"] as const;
const ICON: Record<string, string> = { text: "💬", audio: "🎙", image: "🖼", video: "🎬", document: "📎" };

export default function MensajesPage() {
  const { locale, t: dict } = useLocale();
  const t = dict.gestion;
  const [items, setItems] = useState<Mensaje[] | null>(null);
  const [tipo, setTipo] = useState<string>("all");
  const [q, setQ] = useState("");

  function reload() {
    getMensajes(locale, tipo, q).then(setItems).catch(() => setItems([]));
  }
  useEffect(reload, [locale, tipo]);

  const filterLabel = (f: string) =>
    f === "all" ? t.fAll : f === "text" ? dict.inicio.chips.mensajes : f === "audio" ? dict.inicio.chips.audios : dict.inicio.chips.imagenes;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
      <h1 className="mb-4 text-2xl font-bold text-ink">{dict.inicio.nav.mensajes}</h1>

      {/* Buscador */}
      <div className="mb-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && reload()}
          placeholder={t.msgSearch}
          className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink shadow-card placeholder:text-faint focus:border-brand focus:outline-none" />
        <button onClick={reload} className="shrink-0 rounded-lg bg-brand px-5 text-sm font-semibold text-white">{dict.inicio.searchBtn}</button>
      </div>

      {/* Filtros por tipo */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setTipo(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${tipo === f ? "border-brand bg-brand-soft text-brand" : "border-line text-muted hover:bg-soft"}`}>
            {filterLabel(f)}
          </button>
        ))}
      </div>

      {items && items.length === 0 && <Card className="px-4 py-16 text-center text-muted">{t.msgEmpty}</Card>}
      <ul className="space-y-2">
        {items?.map((m) => (
          <li key={m.id}>
            <Card className="flex items-start gap-3 p-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-soft text-base">{ICON[m.tipo] ?? "💬"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{m.remitente ?? "—"}</span>
                  <span className="shrink-0 text-xs text-faint">{new Date(m.ts).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-xs text-muted">{m.chat}</p>
                {m.texto && (
                  <p className="mt-1 text-sm text-ink2">
                    {m.transcripto && <span className="mr-1 rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">🎙 {t.msgTranscribed}</span>}
                    {m.transcripto ? `“${m.texto}”` : m.texto}
                  </p>
                )}
                {!m.texto && <p className="mt-1 text-sm italic text-faint">[{m.tipo}]</p>}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
