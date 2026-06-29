"use client";

// Layout del panel: provee el idioma compartido y el chrome (sidebar + topbar).
// Shell se carga solo en el cliente (ssr: false) para evitar errores de hidratación
// causados por contenido dependiente del locale almacenado en localStorage.
import dynamic from "next/dynamic";

import { LocaleProvider } from "@/lib/locale-context";

const Shell = dynamic(
  () => import("@/components/shell").then((m) => ({ default: m.Shell })),
  { ssr: false, loading: () => <div className="min-h-screen bg-[#f5f7fb]" /> },
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <Shell>{children}</Shell>
    </LocaleProvider>
  );
}
