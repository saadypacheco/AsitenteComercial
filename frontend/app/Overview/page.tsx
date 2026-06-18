// Landing de VENTA (pública, sin login) — ruta /Overview.
// Pensada como plantilla reutilizable entre proyectos: posicionamiento genérico
// (cualquier equipo que vive en WhatsApp), video + presentación con imágenes,
// segmentos de cliente y CTA. Reemplazá los placeholders de video/imágenes.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asistente Comercial — Tu equipo vive en WhatsApp",
  description:
    "Inteligencia comercial sobre WhatsApp: captura, ordena y actúa con IA para que no se te pierda ningún contacto ni ninguna venta.",
};

// ── Datos de la página (editá acá para reusar en otro proyecto) ──────────────
const BRAND = "Asistente Comercial";
const TAGLINE = "Tu equipo vive en WhatsApp. Nosotros lo convertimos en tu mejor vendedor.";
const VIDEO_EMBED_URL = ""; // ← pegá acá el embed de YouTube/Vimeo (ej: https://www.youtube.com/embed/XXXX)
const CTA_URL = "mailto:hola@execally.online?subject=Quiero%20una%20demo";

const FEATURES = [
  { icon: "📲", title: "Captura todo, solo", desc: "Un número escucha tus grupos y guarda cada mensaje, audio y dato. Nunca más se pierde nada." },
  { icon: "🎛️", title: "Centro de control", desc: "Todo tu negocio de un vistazo, desde el celular: actividad, ventas, alertas y tu equipo." },
  { icon: "🤖", title: "Asistente que actúa", desc: "No solo mira: te sugiere la acción con el mensaje ya escrito, y lo envía por vos." },
  { icon: "🚨", title: "Radar “nadie se me pierde”", desc: "Detecta quién se estancó o está por irse, con la acción para recuperarlo." },
  { icon: "👥", title: "Contactos y cartera", desc: "Renovaciones, seguimientos pendientes y oportunidades — sin que se te escape ninguna." },
  { icon: "☀️", title: "Briefing diario", desc: "Cada día, un resumen con lo importante directo a tu chat." },
  { icon: "🎓", title: "Onboarding del equipo", desc: "Ruta de aprendizaje paso a paso; ves en qué etapa está cada uno." },
  { icon: "👔", title: "Multi-líder", desc: "Cada líder ve solo su equipo. Vos ves todo. Escala el control." },
  { icon: "💬", title: "Asistente por Telegram", desc: "Preguntale lo que quieras y respondé con tus datos. Pronto, también actúa." },
  { icon: "📊", title: "Reportes", desc: "Tendencias, ranking y pipeline para decidir con datos." },
];

const SEGMENTS = [
  { icon: "🛡️", title: "Agencias de seguros", desc: "Agentes y líderes que coordinan ventas y renovaciones por WhatsApp." },
  { icon: "🧴", title: "Venta directa / multinivel", desc: "Redes tipo Just, Avon, Natura, Herbalife: líderes con cientos de vendedores en grupos." },
  { icon: "🏠", title: "Inmobiliarias", desc: "Equipos de captación y venta que viven en chats con clientes y propiedades." },
  { icon: "🚗", title: "Concesionarias / autos", desc: "Fuerza de venta que sigue prospectos y posventa por mensajería." },
  { icon: "📦", title: "Distribuidoras / mayoristas", desc: "Fuerza de venta en la calle, pedidos y seguimiento por grupos." },
  { icon: "🎯", title: "Academias y coaches", desc: "Comunidades grandes que coordinan, venden y dan soporte por WhatsApp." },
];

const SHOTS = [
  "Centro de Control (KPIs y alertas)",
  "Acciones sugeridas (la IA que actúa)",
  "Radar de agentes en riesgo",
  "App del agente (onboarding)",
];

export default function OverviewPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,0.35),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-12 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1 text-sm font-medium text-indigo-200">
              ✦ Inteligencia comercial sobre WhatsApp
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              {TAGLINE}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
              {BRAND} <strong className="text-white">escucha</strong> tus grupos, los{" "}
              <strong className="text-white">ordena</strong>, <strong className="text-white">detecta</strong> lo
              importante y <strong className="text-white">actúa</strong> por vos. Todo desde el celular.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={CTA_URL} className="rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400">
                Solicitar una demo
              </a>
              <a href="#video" className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/5">
                ▶ Ver el video
              </a>
            </div>
          </div>

          {/* Video */}
          <div id="video" className="mx-auto mt-14 max-w-4xl scroll-mt-20">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
              {VIDEO_EMBED_URL ? (
                <iframe
                  src={VIDEO_EMBED_URL}
                  title="Demo"
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-indigo-500/20 text-2xl">▶</div>
                  <p className="text-sm">Espacio para el video de demo</p>
                  <p className="text-xs text-slate-500">(pegá el embed en <code>VIDEO_EMBED_URL</code>)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Problema ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">El problema</h2>
          <p className="mt-4 text-lg text-slate-300">
            Tu equipo —decenas, cientos o miles de personas— vive en <strong className="text-white">grupos de WhatsApp</strong>.
            La información está dispersa, se pierden oportunidades, y es imposible saber a simple vista{" "}
            <strong className="text-white">quién necesita ayuda</strong> o <strong className="text-white">a qué cliente volver a llamar</strong>.
            Estás desbordado persiguiendo la información.
          </p>
          <p className="mt-4 text-lg font-semibold text-indigo-200">
            La idea es simple: que la información venga a vos, ordenada — y que un asistente trabaje por vos para que no se te pierda nadie.
          </p>
        </div>
      </section>

      {/* ── Funciones ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Todo lo que vas a tener</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-indigo-400/40 hover:bg-white/[0.05]">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Presentación con imágenes ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold md:text-4xl">La plataforma por dentro</h2>
        <p className="mt-3 text-center text-slate-400">Mirá cómo se ve trabajando.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {SHOTS.map((label) => (
            <figure key={label} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
              {/* Reemplazá por <img src="/shots/xxx.png" .../> con la captura real */}
              <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500">
                🖼️ <span className="ml-2 text-sm">imagen</span>
              </div>
              <figcaption className="border-t border-white/10 px-4 py-3 text-sm text-slate-300">{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── Para quién es ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="text-center text-3xl font-bold md:text-4xl">¿Para quién es?</h2>
        <p className="mt-3 text-center text-slate-400">Cualquier equipo que coordina ventas por grupos de WhatsApp.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SEGMENTS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-3xl">{s.icon}</div>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold md:text-4xl">Cómo funciona</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { n: "1", t: "Conectás", d: "Un número del sistema escucha tus grupos. Tu número personal nunca se toca." },
            { n: "2", t: "Ordena y piensa", d: "Captura todo, lo clasifica y la IA detecta lo importante." },
            { n: "3", t: "Actúa por vos", d: "Te sugiere acciones, te avisa, y responde — desde tu celular." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-indigo-500 text-lg font-bold text-white">{s.n}</div>
              <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
              <p className="mt-2 text-sm text-slate-300">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Seguridad ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-8">
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.06] p-8 text-center">
          <h2 className="text-xl font-bold text-emerald-200">🔒 Tu información, segura</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Tu número personal de WhatsApp <strong className="text-white">no se usa</strong> para nada automático.
            Tus datos son <strong className="text-white">privados y tuyos</strong>. Cada persona ve solo lo que le corresponde.
          </p>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="text-3xl font-extrabold md:text-4xl">Dejá de correr atrás de la información.</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
          Que el sistema la junte, la piense por vos, y te ayude a que no se te pierda ningún contacto ni ninguna venta.
        </p>
        <a href={CTA_URL} className="mt-8 inline-block rounded-xl bg-indigo-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400">
          Solicitar una demo
        </a>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        © {BRAND} · Inteligencia comercial sobre WhatsApp
      </footer>
    </main>
  );
}
