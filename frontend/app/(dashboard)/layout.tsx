"use client";

// Layout del panel: provee el idioma compartido y el chrome (sidebar + topbar).
// Shell se carga solo en el cliente (ssr: false) para evitar errores de hidratación
// causados por contenido dependiente del locale almacenado en localStorage.
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { LocaleProvider } from "@/lib/locale-context";
import { logEvento } from "@/lib/log";

const Shell = dynamic(
  () => import("@/components/shell").then((m) => ({ default: m.Shell })),
  { ssr: false, loading: () => <div className="min-h-screen bg-[#f5f7fb]" /> },
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    logEvento("page_view", { path: pathname });
  }, [pathname]);

  return (
    <LocaleProvider>
      <Shell>{children}</Shell>
    </LocaleProvider>
  );
}
