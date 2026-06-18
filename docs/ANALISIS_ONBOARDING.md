# Análisis — Visión enriquecida del Onboarding del Agente (Producto ③)

Insumos: [onboarding.md](onboarding.md) (visión LMS+IA "Duolingo de los Seguros"),
[onboarding2.md](onboarding2.md) (visión "Copiloto IA", journey a la primera venta) y
14 mockips en `frontend/public/imagenes/`. Objetivo: enriquecer la app del agente
(hoy básica) sin reinventar lo que ya existe.

---

## 1. Los dos prompts

| | **onboarding.md** | **onboarding2.md** ⭐ |
|---|---|---|
| Enfoque | LMS gamificado + IA (academia completa) | Copiloto al **journey hasta la 1ª venta** |
| Métrica norte | Cursos/exámenes completados | **Tiempo a 1ª venta · conversión · deserción · productividad** |
| Canal | App + web | **WhatsApp como canal central** + app |
| Aporta | Catálogo profundo de features (cursos, simulador, coach, RAG, certificaciones, SaaS) | Estructura correcta: 10 pantallas + motor de reglas + KPIs de negocio |

**Decisión recomendada:** adoptar el **encuadre de onboarding2** (journey + KPIs de negocio)
y **rellenar con la profundidad de onboarding.md**. El gran insight es el **cambio de métrica**:
medir *desarrollo de agentes productivos*, no *cursos completados*.

---

## 2. Qué YA tenemos vs qué AGREGA (las 10 pantallas de onboarding2)

| Pantalla (onboarding2) | Estado en mentorcomercial |
|---|---|
| 1. Journey a la 1ª venta (timeline) | 🟡 Tenemos ruta de etapas → **reencuadrar como journey a 1ª venta** |
| 2. Centro de Misiones (XP, misiones, recompensas) | 🆕 **Gamificación profunda** (hoy solo score/%) |
| 3. Zoom Inteligente (antes/durante/después + resumen IA) | 🟡 Zoom andamiado (asistencia) → falta resumen IA |
| 4. Perfil Inteligente (experiencia, nivel, confianza) | 🆕 Captura de perfil sin fricción |
| 5. Riesgo de Deserción (score) | ✅ **Ya está** (radar de estancamiento) |
| 6. Ranking | ✅ Ya está (enriquecer visual) |
| 7. Radar del Líder | ✅ Dashboard multi-líder (enriquecer al estilo `radarlider`) |
| 8. Simulador Comercial IA (cliente virtual, objeciones) | 🆕 **Grande** (roleplay IA) |
| 9. Logros (hitos: 1er Zoom, 1ª cotización, 1ª venta) | 🟡 Logros básicos → **muro de logros + insignias + niveles** |
| 10. Centro Predictivo (prob. venta/abandono, ETA 1ª venta) | 🆕 **Grande** (predicción) |

**Motor de Automatización** (onboarding2): reglas tipo *5 días sin actividad → WhatsApp · 7 días → notificar líder · 10 días → tarea · 2 reprobaciones → mentor · riesgo alto → escalar*.
→ 🟡 Tenemos acciones/alertas + radar; falta **formalizarlo como motor de reglas**.

**De onboarding.md (features de profundidad):** estructura Curso→Módulo→Lección + quizzes,
**Base de conocimiento RAG** (chat sobre docs oficiales; pgvector ya presente), **Coach IA**,
análisis de llamadas, certificaciones con vencimiento, **modelo SaaS** (Básico/Pro/Enterprise).

---

## 3. Referencias visuales (mockups)

| Mockup | Qué muestra | Aplica a |
|---|---|---|
| `dashboard.jpg` | App móvil gamificada (XP, gemas, desafíos, leaderboard con podio) | App del agente (Pantallas 1-2) |
| `centromisiones.jpg` | Misiones/quests + social + daily quest con XP | Centro de Misiones (Pantalla 2) |
| `murologros.jpg` | Puntos, nivel, muro de insignias + leaderboard | Logros (Pantalla 9) |
| `rankinginteligente.jpg` | Ranking | Pantalla 6 |
| `mapariesgo.jpg` | Riesgo/mapa | Pantalla 5 |
| `radarlider.jpg` | Dashboard de líder data-rich (equipos, progreso, gauge) | Radar del Líder (Pantalla 7) |
| `salasimulador.jpg` | Simulador de ventas con **cliente IA en video** (retorio-style) + feedback | Simulador (Pantalla 8) |
| `centropredictivo.jpg` / `2` | Dashboard BI/forecasting enterprise | Centro Predictivo (Pantalla 10) |
| `zoominteligente.jpg` | Zoom con resumen/insights | Pantalla 3 |
| `quiz.jpg`, `tema1/2/3.jpg` | Evaluaciones / contenido por tema | LMS / quizzes |

> **Estándar visual alto**: los mockups son modernos y gamificados. La app del agente actual
> es plana en comparación — el grueso del salto es **UX + gamificación**, no infra nueva.

---

## 4. Roadmap incremental sugerido (alto valor, apoyado en lo existente)

**Fase 1 — Reencuadre + gamificación (mayormente frontend).** Rediseñar `/agente` como
**Journey a la 1ª venta** (timeline con hitos: bienvenida → capacitación → Zoom → evaluación →
1ª cotización → 1ª venta) + **Centro de Misiones** (XP, niveles, misiones diarias, muro de
logros). Apalanca `etapa_progreso` + score existentes. Ref: `dashboard`, `centromisiones`, `murologros`.

**Fase 2 — Motor de reglas.** Formalizar las reglas de automatización sobre el radar +
acciones que ya existen (sin actividad → WhatsApp, sin avance → tarea, reprobación → mentor).

**Fase 3 — IA de conocimiento.** Base de conocimiento **RAG** (chat sobre documentos oficiales,
pgvector ya está) + **Coach IA** (recomendaciones personalizadas). Reusa el asistente.

**Fase 4 — IA pesada (diferenciadores).** Simulador comercial con IA (roleplay/objeciones) +
Centro Predictivo (prob. venta/abandono, ETA a 1ª venta). Mayor esfuerzo.

**Transversal:** KPIs de negocio (tiempo a 1ª venta, conversión, deserción) + modelo **SaaS**
(encaja con vender a otros verticales — ver landing `/Overview`).

---

## 5. Datos clave para recordar

1. **Cambiá la métrica norte:** de "cursos completados" → **"tiempo hasta la 1ª venta / conversión / deserción"**. Reencuadra todo el producto.
2. **Mucho ya existe** (radar de riesgo, ranking, multi-líder, Zoom, asistente, pgvector) — esto es **enriquecer**, no empezar de cero.
3. **No cambiar de stack.** El stack actual (Next.js + FastAPI + Postgres/pgvector + multi-LLM + WhatsApp + Zoom) ya cubre la visión y está más avanzado que el sugerido en los prompts.
4. **El salto es sobre todo UX/gamificación** (Fase 1) — alto impacto, apalancado en datos existentes.
5. **Encaja con la venta multi-vertical** (SaaS + `/Overview`).
