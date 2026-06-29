import type { Config } from "tailwindcss";

// Tema claro/profesional (decisión S1). Mobile-first es el caso base (Principio VI).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Design system portado del mockup (Producto ②, dashboard-v5-mi-dia.html).
        ink: "#101828", // títulos / texto fuerte
        ink2: "#344054", // texto secundario fuerte
        muted: "#667085", // texto apagado
        faint: "#98a2b3", // texto muy apagado
        line: "#eaecf2", // bordes
        soft: "#f4f6fa", // fondos suaves (pills, tracks)
        brand: "#6366f1", // índigo (accent)
        "brand-2": "#8b5cf6", // violeta (fin del gradiente)
        "brand-soft": "#eef0ff", // fondo índigo claro
        // Semáforo
        danger: "#f04438",
        warning: "#f79009",
        ok: "#12b76a",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)",
        "card-lg": "0 8px 28px rgba(16,24,40,.12)",
      },
      backgroundImage: {
        brand: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
