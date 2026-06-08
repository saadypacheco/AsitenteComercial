"use client";

// T028 [US2] — Detalle de lo que pasó HOY en un chat (ventana ET).
// Muestra cada mensaje; si es audio con transcripción (US3) la muestra y enlaza al
// audio original; si es media no-texto muestra su tipo (FR-016).
import Link from "next/link";
import { useEffect, useState } from "react";

import { formatTime } from "@/lib/format";
import { useLocale } from "@/lib/locale-context";
import { getChatDetail, type MessageDetail } from "@/lib/queries/chatDetail";

export default function ChatDetailPage({ params }: { params: { chatId: string } }) {
  const { locale, t: dict } = useLocale();
  const t = dict.today;
  const [msgs, setMsgs] = useState<MessageDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getChatDetail(params.chatId).then(setMsgs).catch((e) => setError(e.message));
  }, [params.chatId]);

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <header className="mb-5">
        <Link href="/hoy" className="text-sm text-brand">
          ← {t.title}
        </Link>
      </header>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!msgs && !error && <p className="text-sm text-muted">…</p>}
      {msgs && msgs.length === 0 && (
        <div className="rounded-xl border border-line bg-white px-4 py-10 text-center">
          <p className="text-muted">{t.empty}</p>
        </div>
      )}

      <ul className="space-y-2">
        {msgs?.map((m) => (
          <li key={m.message_id} className="rounded-xl border border-line bg-white px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">{m.remitente ?? "—"}</span>
              <span className="shrink-0 text-xs text-muted">{formatTime(m.wa_timestamp, locale)}</span>
            </div>

            {/* Texto o caption */}
            {m.body && <p className="mt-1 text-sm">{m.body}</p>}

            {/* Audio transcrito (US3): texto + link al audio original (trazabilidad) */}
            {m.transcripcion && (
              <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-sm italic text-muted">“{m.transcripcion.texto}”</p>
                <p className="mt-1 text-xs text-muted">
                  🎙 {m.transcripcion.idioma ?? "?"} ·{" "}
                  <span className="text-brand">{t.audioOriginal}</span>
                </p>
              </div>
            )}

            {/* Media no-texto/no-audio: solo metadata (FR-016) */}
            {m.media && !m.transcripcion && (
              <p className="mt-1 text-sm text-muted">[{m.media.tipo}]</p>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
