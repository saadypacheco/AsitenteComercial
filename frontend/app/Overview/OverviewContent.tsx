"use client";

// Contenido bilingüe de la landing /Overview (toggle ES/EN).
// Para reusar en otro proyecto: editá BRAND y el diccionario T (es/en).
import { useState } from "react";

const BRAND = "Asistente Comercial";
const VIDEO_EMBED_URL = ""; // ← embed de YouTube/Vimeo (ej: https://www.youtube.com/embed/XXXX)
const CTA_URL = "mailto:hola@execally.online?subject=Demo";

type Lang = "es" | "en";

const T = {
  es: {
    badge: "✦ Inteligencia comercial sobre WhatsApp",
    tagline: "Tu equipo vive en WhatsApp. Nosotros lo convertimos en tu mejor vendedor.",
    intro_a: "escucha", intro_b: "ordena", intro_c: "detecta", intro_d: "actúa",
    introTail: "por vos. Todo desde el celular.",
    ctaDemo: "Solicitar una demo",
    watch: "▶ Ver el video",
    videoHint: "Espacio para el video de demo",
    problemTitle: "El problema",
    problem: "Tu equipo —decenas, cientos o miles de personas— vive en grupos de WhatsApp. La información está dispersa, se pierden oportunidades, y es imposible saber a simple vista quién necesita ayuda o a qué cliente volver a llamar. Estás desbordado persiguiendo la información.",
    problemHi: "La idea es simple: que la información venga a vos, ordenada — y que un asistente trabaje por vos para que no se te pierda nadie.",
    featuresTitle: "Todo lo que vas a tener",
    insideTitle: "La plataforma por dentro",
    insideSub: "Mirá cómo se ve trabajando.",
    imgLabel: "imagen",
    forWhoTitle: "¿Para quién es?",
    forWhoSub: "Cualquier equipo que coordina ventas por grupos de WhatsApp.",
    howTitle: "Cómo funciona",
    secTitle: "🔒 Tu información, segura",
    sec: "Tu número personal de WhatsApp no se usa para nada automático. Tus datos son privados y tuyos. Cada persona ve solo lo que le corresponde.",
    finalTitle: "Dejá de correr atrás de la información.",
    final: "Que el sistema la junte, la piense por vos, y te ayude a que no se te pierda ningún contacto ni ninguna venta.",
    footer: "Inteligencia comercial sobre WhatsApp",
    features: [
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
    ],
    segments: [
      { icon: "🛡️", title: "Agencias de seguros", desc: "Agentes y líderes que coordinan ventas y renovaciones por WhatsApp." },
      { icon: "🧴", title: "Venta directa / multinivel", desc: "Redes tipo Just, Avon, Natura, Herbalife: líderes con cientos de vendedores en grupos." },
      { icon: "🏠", title: "Inmobiliarias", desc: "Equipos de captación y venta que viven en chats con clientes y propiedades." },
      { icon: "🚗", title: "Concesionarias / autos", desc: "Fuerza de venta que sigue prospectos y posventa por mensajería." },
      { icon: "📦", title: "Distribuidoras / mayoristas", desc: "Fuerza de venta en la calle, pedidos y seguimiento por grupos." },
      { icon: "🎯", title: "Academias y coaches", desc: "Comunidades grandes que coordinan, venden y dan soporte por WhatsApp." },
    ],
    shots: ["Centro de Control (KPIs y alertas)", "Acciones sugeridas (la IA que actúa)", "Radar de agentes en riesgo", "App del agente (onboarding)"],
    steps: [
      { n: "1", t: "Conectás", d: "Un número del sistema escucha tus grupos. Tu número personal nunca se toca." },
      { n: "2", t: "Ordena y piensa", d: "Captura todo, lo clasifica y la IA detecta lo importante." },
      { n: "3", t: "Actúa por vos", d: "Te sugiere acciones, te avisa, y responde — desde tu celular." },
    ],
  },
  en: {
    badge: "✦ AI sales intelligence over WhatsApp",
    tagline: "Your team lives on WhatsApp. We turn it into your best salesperson.",
    intro_a: "listens to", intro_b: "organizes", intro_c: "detects", intro_d: "acts",
    introTail: "for you. All from your phone.",
    ctaDemo: "Request a demo",
    watch: "▶ Watch the video",
    videoHint: "Space for the demo video",
    problemTitle: "The problem",
    problem: "Your team —dozens, hundreds or thousands of people— lives in WhatsApp groups. Information is scattered, opportunities slip away, and it's impossible to tell at a glance who needs help or which client to call back. You're overwhelmed chasing the information.",
    problemHi: "The idea is simple: let the information come to you, organized — and let an assistant work for you so no one falls through the cracks.",
    featuresTitle: "Everything you get",
    insideTitle: "Inside the platform",
    insideSub: "See it working.",
    imgLabel: "image",
    forWhoTitle: "Who is it for?",
    forWhoSub: "Any team that runs sales through WhatsApp groups.",
    howTitle: "How it works",
    secTitle: "🔒 Your data, secure",
    sec: "Your personal WhatsApp number is never used for anything automated. Your data is private and yours. Each person sees only what's theirs.",
    finalTitle: "Stop chasing the information.",
    final: "Let the system gather it, think for you, and help you never lose a contact or a sale.",
    footer: "AI sales intelligence over WhatsApp",
    features: [
      { icon: "📲", title: "Captures everything, alone", desc: "A number listens to your groups and stores every message, audio and detail. Nothing is ever lost." },
      { icon: "🎛️", title: "Control center", desc: "Your whole business at a glance, from your phone: activity, sales, alerts and your team." },
      { icon: "🤖", title: "An assistant that acts", desc: "It doesn't just watch: it suggests the action with the message already written, and sends it for you." },
      { icon: "🚨", title: "“No one slips away” radar", desc: "Detects who stalled or is about to leave, with the action to win them back." },
      { icon: "👥", title: "Contacts & book of business", desc: "Renewals, pending follow-ups and opportunities — none of them slipping away." },
      { icon: "☀️", title: "Daily briefing", desc: "Every day, a summary of what matters straight to your chat." },
      { icon: "🎓", title: "Team onboarding", desc: "A step-by-step learning path; see what stage each person is at." },
      { icon: "👔", title: "Multi-leader", desc: "Each leader sees only their team. You see everything. Scale your control." },
      { icon: "💬", title: "Telegram assistant", desc: "Ask it anything and get answers from your own data. Soon, it acts too." },
      { icon: "📊", title: "Reports", desc: "Trends, ranking and pipeline to decide with data." },
    ],
    segments: [
      { icon: "🛡️", title: "Insurance agencies", desc: "Agents and leaders coordinating sales and renewals over WhatsApp." },
      { icon: "🧴", title: "Direct sales / MLM", desc: "Networks like Just, Avon, Natura, Herbalife: leaders with hundreds of sellers in groups." },
      { icon: "🏠", title: "Real estate", desc: "Lead-gen and sales teams living in chats with clients and listings." },
      { icon: "🚗", title: "Car dealerships", desc: "Sales forces following prospects and after-sales over messaging." },
      { icon: "📦", title: "Distributors / wholesalers", desc: "Field sales, orders and follow-up through groups." },
      { icon: "🎯", title: "Academies & coaches", desc: "Large communities that coordinate, sell and support over WhatsApp." },
    ],
    shots: ["Control Center (KPIs & alerts)", "Suggested actions (AI that acts)", "At-risk agents radar", "Agent app (onboarding)"],
    steps: [
      { n: "1", t: "Connect", d: "A system number listens to your groups. Your personal number is never touched." },
      { n: "2", t: "Organize & think", d: "It captures everything, classifies it, and the AI detects what matters." },
      { n: "3", t: "Acts for you", d: "It suggests actions, alerts you, and replies — from your phone." },
    ],
  },
} as const;

export default function OverviewContent() {
  const [lang, setLang] = useState<Lang>("es");
  const t = T[lang];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* Toggle de idioma */}
      <div className="fixed right-4 top-4 z-50 flex overflow-hidden rounded-full border border-white/15 bg-slate-900/80 text-xs font-semibold backdrop-blur">
        {(["es", "en"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-3 py-1.5 transition ${lang === l ? "bg-indigo-500 text-white" : "text-slate-300 hover:bg-white/5"}`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,0.35),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-12 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1 text-sm font-medium text-indigo-200">
              {t.badge}
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">{t.tagline}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
              {BRAND} <strong className="text-white">{t.intro_a}</strong> {lang === "es" ? "tus grupos, los" : "your groups,"}{" "}
              <strong className="text-white">{t.intro_b}</strong>, <strong className="text-white">{t.intro_c}</strong>{" "}
              {lang === "es" ? "lo importante y" : "what matters and"} <strong className="text-white">{t.intro_d}</strong> {t.introTail}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={CTA_URL} className="rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400">{t.ctaDemo}</a>
              <a href="#video" className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/5">{t.watch}</a>
            </div>
          </div>

          <div id="video" className="mx-auto mt-14 max-w-4xl scroll-mt-20">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
              {VIDEO_EMBED_URL ? (
                <iframe src={VIDEO_EMBED_URL} title="Demo" className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-indigo-500/20 text-2xl">▶</div>
                  <p className="text-sm">{t.videoHint}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Problema */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">{t.problemTitle}</h2>
          <p className="mt-4 text-lg text-slate-300">{t.problem}</p>
          <p className="mt-4 text-lg font-semibold text-indigo-200">{t.problemHi}</p>
        </div>
      </section>

      {/* Funciones */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="text-center text-3xl font-bold md:text-4xl">{t.featuresTitle}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-indigo-400/40 hover:bg-white/[0.05]">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Presentación con imágenes */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold md:text-4xl">{t.insideTitle}</h2>
        <p className="mt-3 text-center text-slate-400">{t.insideSub}</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {t.shots.map((label) => (
            <figure key={label} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
              <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500">
                🖼️ <span className="ml-2 text-sm">{t.imgLabel}</span>
              </div>
              <figcaption className="border-t border-white/10 px-4 py-3 text-sm text-slate-300">{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Para quién es */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="text-center text-3xl font-bold md:text-4xl">{t.forWhoTitle}</h2>
        <p className="mt-3 text-center text-slate-400">{t.forWhoSub}</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.segments.map((s) => (
            <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-3xl">{s.icon}</div>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold md:text-4xl">{t.howTitle}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {t.steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-indigo-500 text-lg font-bold text-white">{s.n}</div>
              <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
              <p className="mt-2 text-sm text-slate-300">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Seguridad */}
      <section className="mx-auto max-w-5xl px-6 pb-8">
        <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.06] p-8 text-center">
          <h2 className="text-xl font-bold text-emerald-200">{t.secTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">{t.sec}</p>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h2 className="text-3xl font-extrabold md:text-4xl">{t.finalTitle}</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">{t.final}</p>
        <a href={CTA_URL} className="mt-8 inline-block rounded-xl bg-indigo-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400">{t.ctaDemo}</a>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">© {BRAND} · {t.footer}</footer>
    </main>
  );
}
