"use client";

import Image from "next/image";

// ── Copy (English only) ───────────────────────────────────────────────────────
const C = {
  hero: {
    tag: "Your system guide",
    title: "Everything Execally does for you",
    sub: "No tech jargon. Just what you need to know to lead your team every day.",
  },
  memory: {
    tag: "Memory",
    title: "The system remembers everything — you just decide",
    body: "Execally connects four sources of information in one place:",
    sources: [
      { icon: "📱", title: "Your phone", detail: "Every WhatsApp message from your groups enters automatically. No copying. No forwarding. Connect once and that's it." },
      { icon: "🎓", title: "Onboarding content", detail: "You send a voice note, video or message to a dedicated WhatsApp group and the system automatically classifies it into the right training stage — no manual uploads." },
      { icon: "📹", title: "Meetings", detail: "When a meeting ends, you paste the transcript and the system extracts the summary, tasks, and assigns them to each agent automatically." },
      { icon: "📊", title: "Agent progress", detail: "Which stages each agent completed, how far from their first sale, where they got stuck — always up to date." },
    ],
    caption: "Memory: search anything — a message, a person, a date — and the system finds it instantly.",
    flowLabel: "📱 WhatsApp + 🎓 Onboarding + 📹 Meetings + 📊 Progress = one place to search everything",
  },
  onboarding: {
    tag: "WhatsApp → Training",
    title: "You record once. Every agent learns.",
    body: "You have a dedicated WhatsApp group on your phone with the system's second number. When you send something there, it publishes automatically.",
    steps: [
      { icon: "🎙️", title: "You send", detail: "A voice note explaining how to handle price objections. Or a video of a great sales call. Or just a text tip. From your phone, in that group." },
      { icon: "🤖", title: "The AI classifies", detail: "The system reads the content and decides which training stage it belongs to — \"Handling Objections\", \"First Call\", \"Closing\". No configuration needed." },
      { icon: "✅", title: "You get notified", detail: "An internal notification confirms \"Published in: Handling Objections\". If confidence is low it says \"Please review\" so you can reassign." },
      { icon: "📖", title: "Agents see it", detail: "Inside their training path, each stage now shows your content — text, audio player, video. They learn from your real examples." },
    ],
    caption: "Agent view: each training stage shows the content you published from WhatsApp.",
  },
  status: {
    tag: "Your team's status",
    title: "You always know who needs help — without asking",
    body: "The Progress screen shows all your agents sorted by risk. The one who needs your attention most is always first.",
    bullets: [
      "🔴 High risk — no activity, no training, no simulations",
      "🟡 Warning — low progress or recent absences",
      "🟢 On track — progressing well, no alerts",
    ],
    caption: "The agent at 0% progress appears at the top. You don't have to search — the system shows you.",
  },
  actions: {
    tag: "Automatic actions",
    title: "One click to reach everyone who needs it",
    body: "When the system detects a problem, it tells you what to do and gives you the button to do it.",
    cards: [
      { icon: "📨", title: "Group messages", detail: "5 agents haven't attended any training. The system detects it, you press 'Message' and all five receive it instantly. No manual WhatsApp, no email." },
      { icon: "📋", title: "Tasks from meetings", detail: "You upload your meeting transcript and the system creates tasks automatically. Each agent only sees the ones assigned to them." },
      { icon: "🌅", title: "Daily briefing", detail: "Every morning a summary arrives on your WhatsApp: who missed training, who closed sales, which agent is at risk. Everything in 30 seconds." },
    ],
    caption: "The message modal: reach every agent with an issue in a single click.",
  },
  agents: {
    tag: "What your agents see",
    title: "They learn, practice, and ask — on their own",
    body: "Each agent has their own app with everything they need to move forward without depending on you.",
    items: [
      { img: "/demo/agent-today.png", title: "Their progress today", detail: "They see their level, weekly missions, and the day's Zoom sessions. Everything personalized for them." },
      { img: "/demo/agent-simulator.png", title: "The sales simulator", detail: "They practice with a virtual client who gives them real objections. You see how many times they practiced and their score from the Practice screen." },
      { img: "/demo/agent-coach.png", title: "The AI Coach", detail: "They ask the system how to handle an objection, what the policy covers, what the renewal script says. Answers in seconds, from your own documentation." },
    ],
  },
  settings: {
    tag: "Your configuration",
    title: "Set it once, it runs by itself",
    body: "In Settings you choose your daily briefing time, designate which WhatsApp group is the training channel, see the status of all connections, and can send a test at any time.",
    caption: "Configure once and the system reports to you every day.",
  },
  closing: {
    title: "You start knowing everything. You finish with free time.",
    items: [
      "No reading WhatsApp groups when you wake up",
      "No asking 'how is X doing?' one by one",
      "No uploading training content to yet another platform",
      "No spreadsheets to figure out who's on track and who isn't",
      "No waiting until Monday to know if Friday's meeting was useful",
    ],
  },
};

// ── Components ───────────────────────────────────────────────────────────────
function SectionTag({ label }: { label: string }) {
  return (
    <span className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand">
      {label}
    </span>
  );
}

function ScreenshotCard({ src, caption, priority = false }: { src: string; caption: string; priority?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-line shadow-[0_4px_24px_-6px_rgba(0,0,0,0.10)]">
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
        <Image src={src} alt={caption} fill className="object-cover object-top" priority={priority} sizes="(max-width: 768px) 100vw, 800px" />
      </div>
      <figcaption className="bg-soft px-4 py-2.5 text-center text-xs text-muted italic">
        {caption}
      </figcaption>
    </figure>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ParaCeciliaPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-20 px-4 py-10 pb-24">

      {/* HERO */}
      <section className="text-center">
        <SectionTag label={C.hero.tag} />
        <h1 className="mt-4 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          {C.hero.title}
        </h1>
        <p className="mt-3 text-base text-muted">{C.hero.sub}</p>
      </section>

      {/* MEMORY */}
      <section className="space-y-8">
        <div>
          <SectionTag label={C.memory.tag} />
          <h2 className="mt-3 text-2xl font-black text-ink">{C.memory.title}</h2>
          <p className="mt-2 text-muted">{C.memory.body}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {C.memory.sources.map((s) => (
            <div key={s.title} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-xl">{s.icon}</div>
              <p className="mb-1 font-bold text-ink">{s.title}</p>
              <p className="text-sm text-muted leading-relaxed">{s.detail}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-dashed border-brand/30 bg-brand-soft/40 p-5 text-center text-sm text-brand font-medium">
          {C.memory.flowLabel}
        </div>

        <ScreenshotCard src="/demo/memory.png" caption={C.memory.caption} priority />
      </section>

      {/* WHATSAPP → ONBOARDING */}
      <section className="space-y-8">
        <div>
          <SectionTag label={C.onboarding.tag} />
          <h2 className="mt-3 text-2xl font-black text-ink">{C.onboarding.title}</h2>
          <p className="mt-2 text-muted">{C.onboarding.body}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {C.onboarding.steps.map((step, i) => (
            <div key={i} className="relative rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-black text-white">{i + 1}</span>
                <span className="text-xl">{step.icon}</span>
              </div>
              <p className="mb-1 font-bold text-ink">{step.title}</p>
              <p className="text-sm text-muted leading-relaxed">{step.detail}</p>
            </div>
          ))}
        </div>

        {/* Flow diagram */}
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-brand/20 bg-brand-soft/30 p-6 text-center sm:flex-row sm:justify-between">
          {["📲 You send to the group", "🤖 AI classifies", "✅ You're notified", "📖 Agents learn"].map((step, i, arr) => (
            <div key={i} className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
              <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm">{step}</span>
              {i < arr.length - 1 && <span className="text-brand opacity-60 sm:rotate-0 rotate-90">→</span>}
            </div>
          ))}
        </div>

        <ScreenshotCard src="/demo/agent-today.png" caption={C.onboarding.caption} />
      </section>

      {/* TEAM STATUS */}
      <section className="space-y-6">
        <div>
          <SectionTag label={C.status.tag} />
          <h2 className="mt-3 text-2xl font-black text-ink">{C.status.title}</h2>
          <p className="mt-2 text-muted">{C.status.body}</p>
        </div>

        <ul className="space-y-2">
          {C.status.bullets.map((b) => (
            <li key={b} className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink shadow-sm">
              {b}
            </li>
          ))}
        </ul>

        <ScreenshotCard src="/demo/progress.png" caption={C.status.caption} />
      </section>

      {/* AUTOMATIC ACTIONS */}
      <section className="space-y-8">
        <div>
          <SectionTag label={C.actions.tag} />
          <h2 className="mt-3 text-2xl font-black text-ink">{C.actions.title}</h2>
          <p className="mt-2 text-muted">{C.actions.body}</p>
        </div>

        <div className="space-y-4">
          {C.actions.cards.map((card, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-xl">{card.icon}</div>
              <div>
                <p className="font-bold text-ink">{card.title}</p>
                <p className="mt-1 text-sm text-muted leading-relaxed">{card.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <ScreenshotCard src="/demo/memory-modal.png" caption={C.actions.caption} />
      </section>

      {/* AGENT EXPERIENCE */}
      <section className="space-y-8">
        <div>
          <SectionTag label={C.agents.tag} />
          <h2 className="mt-3 text-2xl font-black text-ink">{C.agents.title}</h2>
          <p className="mt-2 text-muted">{C.agents.body}</p>
        </div>

        <div className="space-y-8">
          {C.agents.items.map((item) => (
            <div key={item.title} className="space-y-3">
              <div>
                <p className="font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.detail}</p>
              </div>
              <ScreenshotCard src={item.img} caption={item.title} />
            </div>
          ))}
        </div>
      </section>

      {/* SETTINGS */}
      <section className="space-y-6">
        <div>
          <SectionTag label={C.settings.tag} />
          <h2 className="mt-3 text-2xl font-black text-ink">{C.settings.title}</h2>
          <p className="mt-2 text-muted">{C.settings.body}</p>
        </div>
        <ScreenshotCard src="/demo/settings.png" caption={C.settings.caption} />
      </section>

      {/* CLOSING */}
      <section className="rounded-3xl bg-gradient-to-br from-brand to-[#0ea5e9] p-8 text-white shadow-[0_8px_32px_-8px_rgba(56,189,248,0.5)]">
        <h2 className="mb-6 text-2xl font-black">{C.closing.title}</h2>
        <ul className="space-y-3">
          {C.closing.items.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm font-medium text-white/90">
              <span className="mt-0.5 shrink-0 text-base">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
}
