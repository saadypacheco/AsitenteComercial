// App del agente (Producto ③) — mobile-first, fuera del panel de la líder.
// Provee solo el idioma (sin sidebar): es su propia experiencia.
import { LocaleProvider } from "@/lib/locale-context";

export default function AgenteLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
