// Landing de VENTA (pública, sin login) — ruta /Overview.
// Bilingüe es/en (toggle en OverviewContent). Plantilla reutilizable entre proyectos.
import type { Metadata } from "next";

import OverviewContent from "./OverviewContent";

export const metadata: Metadata = {
  title: "Asistente Comercial — Tu equipo vive en WhatsApp",
  description:
    "Inteligencia comercial sobre WhatsApp: captura, ordena y actúa con IA para que no se te pierda ningún contacto ni ninguna venta. / AI sales intelligence over WhatsApp.",
};

export default function OverviewPage() {
  return <OverviewContent />;
}
