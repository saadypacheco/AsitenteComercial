"use client";

import { Card } from "@/components/ui";
import { useLocale } from "@/lib/locale-context";

export default function PendientesPage() {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <h1 className="mb-4 text-2xl font-bold text-ink">{t.inicio.nav.pendientes}</h1>
      <Card className="px-4 py-16 text-center text-muted">{t.inicio.soon}…</Card>
    </div>
  );
}
