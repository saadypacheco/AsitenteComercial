# Sales Assistant — Proposal & Vision

**For:** client presentation
**Version:** 1.0 · June 2026
**Status:** Clickable prototype + phased development plan

> *Working name: "Assistant". Final commercial name to be defined with the client.*

---

## 1. In one sentence

**An assistant that tells the sales leader what to do today and lets them operate their entire team from one place — simple, from the phone.**

It's not a CRM or a training platform. It's an **operating system for sales leaders** managing large teams.

---

## 2. The problem we solve

The sales leader (profile: manages ~1,300 agents) **is drowning**:

- Everything comes in through WhatsApp and they can't keep up → important things slip through.
- They don't know **who's about to quit** or **who to help first**.
- **Onboarding new agents is slow** and they can't see where people get stuck.
- They manage from memory → stress, things forgotten, no way to scale.

> **They don't need more information. They need to know where to act today.**

---

## 3. The solution: what it feels like

Three ideas drive the whole product:

1. **Visible urgency** — on open, they see *what to do now*, prioritized by color (🔴🟠🟡🟢).
2. **Direct action** — operate everything from the board (reply, call, assign, recognize), like a digital wallet.
3. **Radical simplicity** — one thing at a time, designed for a non-technical user.

And a key shift in focus: the core is a **smart WhatsApp inbox** — we capture what comes in, sort it by urgency, and the leader replies from the app. Every message also feeds the system.

### The 3 pillars
- **CONTROL** — see the whole team's status at a glance (Agent Score, 0–100).
- **FOLLOW-UP** — turn data into actions: who to call, who to help, who's leaving.
- **DEVELOPMENT** — game-like onboarding toward the first sale.

---

## 4. What you can already see today (clickable prototype)

There is a clickable prototype of the main screens. This already exists and can be shown:

### Leader App
| Screen | What it does |
|---|---|
| **Login** | Simple login · multi-language (🇺🇸 EN / 🇪🇸 ES / 🇧🇷 PT) · sign-in via WhatsApp code |
| **My Day** | Timeline of the day (what's left and when) + team summary + **quick actions** + prioritized task list (step-by-step guided mode) |
| **Inbox** | All WhatsApp messages triaged (🔴 urgent / 🟠 can wait / ✅ answered) with quick reply |
| **Agents** | List sorted by urgency, filters by Score and situation, integrated communication |
| **Agent detail** | Score breakdown, onboarding path, **single thread** (WhatsApp + app), history and actions |
| **Onboarding** | Funnel of steps and who got stuck on the way to the first sale |

### Agent App
| Screen | What it does |
|---|---|
| **Today** | Their urgent task, daily agenda, next milestone, recognitions |
| **Agenda** | Their calendar (today / tomorrow / week) with times and Zoom access |
| **Learning path** | 8-step game-like path toward the first sale, with material per step |
| **Progress** | Their Score, metrics, streak and advancement |
| **Achievements** | Badges and group ranking |
| **Alerts & chat with leader** | Notifications + direct conversation |

> *Note: the prototype shows the experience with sample data. It is not yet connected to a database or real systems (that's part of the build).*

---

## 5. How it works under the hood (the loop)

```
  Messages (WhatsApp) · activity · Zoom · production
                    │
                    ▼
        The system CALCULATES automatically
        (each agent's Score + prioritized alerts)
                    │
                    ▼
   The leader sees "what to do today" and ACTS in 1–2 taps
                    │
                    ▼
        Everything gets RECORDED in the history
                    │
                    └──► and feeds back into the system
```

The **Agent Score (0–100)** sums up each person in a single number, made of: Activity, Training attendance, Goal compliance, and Interaction.

---

## 6. Where we're going — Phased roadmap

| Phase | Focus | Includes |
|---|---|---|
| **Phase 0 · Discovery** *(in progress)* | Validate what we don't know yet | Data access, team structure, WhatsApp number, agenda definition |
| **Phase 1 · MVP** | Control, follow-up and onboarding working | Dashboard + Score + Inbox + Alerts + Onboarding + leader/agent apps, connected to a real database |
| **Phase 2 · Automation** | Let data flow in by itself | WhatsApp Business API (real inbox), automatic Zoom attendance, production data (WFG), push notifications, real mass messaging |
| **Phase 3 · Intelligence (AI)** | Boost with AI | 24/7 sales assistant for agents, sales simulator, churn prediction engine, automatic meeting summaries |

> Value is delivered early: **Phase 1 already solves ~80% of the pain without AI**. AI is added later as an expansion.

---

## 7. What's still missing (and why it matters)

### a) Connect to the real world (integrations)
- **WhatsApp Business API** → to actually capture and reply to messages.
- **Zoom** → automatic training attendance.
- **WFG** → production, sales and commissions (feeds the "time-to-first-sale" KPI).
- **Push notifications** → to deliver alerts.

### b) Build the backend
The prototype is the "face." The "engine" is still missing: database, the engine that computes the Score and generates alerts, and security (financial data → US region, privacy).

### c) Decide the platform
Decide whether the app ships to the stores (App Store / Play Store) or as an installable web app. This defines the technical path.

### d) Complete multi-language
The login already demonstrates it; it needs to be extended across the whole app (English by default + the languages we add).

---

## 8. What we need from you to move forward

To close **Phase 0** we need to validate with you:

1. **What does your day look like and how do you manage your agenda today?** (calendar, meetings, reminders)
2. **How are your ~1,300 agents organized?** (by leader, by cohort, by product…)
3. **Which WhatsApp number do agents write to today?** (defines how we capture messages)
4. **What data does WFG give you and how do you access it?** (defines what we automate)
5. **How do you onboard a new agent and what data do you have on each one?**

*(The full list of questions is ready for a working session.)*

---

## 9. The journey in one line

```
TODAY                   PHASE 1 (MVP)          PHASE 2                 PHASE 3
Clickable prototype  →  Real product       →   Fully automated    →   With AI
(the experience)        connected to data      (WhatsApp/Zoom/WFG)     (prediction, assistant)
```

**We start with what hurts most and delivers value fast. Everything else is an expansion, with a clear path.**

---

*Living document — updated with client feedback and development progress.*
