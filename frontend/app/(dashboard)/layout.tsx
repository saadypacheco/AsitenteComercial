// Layout del panel: provee el idioma compartido y el chrome (sidebar + topbar).
// Todas las páginas bajo (dashboard) heredan el menú navegable y el topbar.
import { Shell } from "@/components/shell";
import { LocaleProvider } from "@/lib/locale-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <Shell>{children}</Shell>
    </LocaleProvider>
  );
}
