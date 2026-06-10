# Validación con el cliente — Cecilia (Asistente Comercial)

**Interno · no publicar.** Última actualización: 2026-06.
Documento vivo: perfil, análisis de gaps, propuestas de alto impacto y preguntas a validar.

---

## 1. Perfil de Cecilia

- Dueña de una **agencia de servicios financieros** + **fundación de educación financiera** (enfocada en **retiro**).
- Lidera **~2.000 agentes** y tiene **varios líderes de alto rendimiento** a su cargo.
- Vende principalmente **productos de AIG** y **seguros de vida**.
- Día **altamente operativo**: pasa el día en **reuniones de Zoom** y **gestionando todo por WhatsApp**.
- Quiere una solución **mobile-first** y controlar todo desde el **celular**.
- **Hoy está desbordada.**

### Sus preocupaciones clave
1. **Formación y onboarding** — capacitar a los nuevos agentes de forma eficiente.
2. **Seguimiento de agentes** — monitorear a los **nuevos y a los consolidados**; saber si alguno se **estancó** o necesita ayuda.
3. **Seguimiento de clientes** — no perder oportunidades ni descuidar la **cartera actual**.
4. **Sistema que centralice todo**, **automatice** los flujos de aprendizaje y seguimiento, y actúe como **asistente inteligente** que **recomiende y tome acciones** (ej.: enviar mensaje a X agente, mandar email a Y cliente). En resumen: **control total para no olvidarse de nadie**.

### Líderes (segmentación) — REQUISITO
Los **líderes de Cecilia** necesitan **algo similar a Cecilia pero segmentado a su propio equipo**: cada líder ve/gestiona **solo sus agentes** (su sub-árbol de la jerarquía), con su propio dashboard, pendientes, alertas y acciones. Cecilia ve todo; cada líder ve lo suyo.
→ Multi-líder con **scoping jerárquico** (por `superior_id`). Pendiente de construir.

### Zoom (lo que pidió explícitamente)
- **Control de asistencia automático** + **grabar** las reuniones.
- Dos tipos de reunión: **formación de nuevos agentes** y **reuniones de líderes** (objetivos/estrategia).
- Hay que **registrar asistencia** y **procesar la información** de las reuniones de forma **automática**.
- Cruce con el dashboard: si un agente **no asistió** a las últimas formaciones, o si en la reunión de líderes se **acordó un objetivo** → la IA genera **alertas/tareas de seguimiento automáticas**.

### Estrategia de MVP (su planteo de fases)
- **Paso 0 (prioridad): entender y conectar la data de WFG** (World Financial Group, el sistema que conecta con las aseguradoras). Saber qué provee, cómo extraerla y estructurarla.
- **Fase 1: Dashboard visual de diagnóstico** (cuellos de botella) — móvil y simple: procesa data de WFG + Zoom y muestra de un vistazo qué agentes están parados, alertas de inasistencia, alertas de clientes.
- **Fase 2: Roadmap de onboarding** (checklist interactivo) — lado agente (hoja de ruta con checklists) + lado Cecilia (ve en qué paso está cada uno; si se traba en el paso 3, el sistema avisa).

---

## 2. Qué construimos vs. qué falta

### ✅ Ya construido
- **① Captura WhatsApp** (WAHA andamiado + captura inmutable + worker que clasifica y extrae eventos comerciales).
- **② Dashboard de la líder**: Inicio "centro de control" (KPIs, recomendaciones IA, estado del equipo, alertas, ranking, oportunidades), Pendientes (CRUD + panel IA), Agentes (mapa + jerarquía + carga + CRUD), Grupos, Eventos ($ + probabilidad), Mensajes (feed), Reportes (gráficos), IA Insights, Ajustes.
- **③ Onboarding/Capacitación**: programa por etapas (funnel), progreso por agente, calendario, alertas, notificaciones; **app del agente** (Ruta, Agenda con Zoom, Progreso, Logros, Ayuda).
- **Zoom**: asistencia automática **andamiada y probada** (reconciliación por email).
- **Base**: auth (líder + agente por magic link), bilingüe es/en, aislamiento por tenant, mobile-first.
- **Nota:** ya tenemos hecho lo que su plan llamaba **Fase 1 y Fase 2**.

### 🔴 Lo que falta
1. **Conexión WFG** (Paso 0): producción/ventas/comisiones. Define "consolidado estancado" y la cartera real. **Depende de qué da WFG** (API/export/pantalla) → discovery.
2. **Seguimiento de CLIENTES / cartera** (preocupación #3): no existe módulo de clientes (renovaciones, oportunidades, cross-sell).
3. **La IA que ACTÚA** (responde/manda por ella): hoy recomienda, no ejecuta. → **se empieza a construir (Feature A).**
4. **Procesamiento automático de reuniones**: grabar + transcribir + extraer objetivos/compromisos → generar tareas solas.
5. **Reglas de seguimiento automáticas**: "no asistió a 2 formaciones → alerta + mensaje"; "se acordó objetivo X → tarea para Y".
6. **Detección de estancamiento/abandono** (nuevos y consolidados) con señales tempranas.
7. **Líderes con dashboard segmentado** (multi-líder jerárquico).
8. Checklists de sub-tareas por etapa + alerta de "trabado N días en el paso".

---

## 3. Propuestas de alto impacto

Hilo conductor: **dejar de ser un tablero que mira → ser un asistente que trabaja por ella.**

- **A. El Asistente que ACTÚA** ⭐ — bandeja de acciones sugeridas con el mensaje ya redactado → "Aprobar y enviar" (WhatsApp/email). Modo piloto automático para lo de bajo riesgo. El bot responde FAQs en grupos por ella. *(EN CONSTRUCCIÓN.)*
- **B. Reuniones que se procesan solas** ⭐ — graba → transcribe → resumen + objetivos → **tareas de seguimiento automáticas**.
- **C. Radar "nadie se me pierde"** ⭐ — cruza actividad WhatsApp + asistencia + producción WFG → agentes estancados / riesgo de abandono + acción sugerida.
- **D. Cartera de clientes inteligente** — renovaciones próximas, sin seguimiento, cross-sell (vida + retiro).
- **E. Briefing diario por WhatsApp** — resumen + "¿mando los recordatorios?".
- **F. Multi-líder con delegación** — cada líder ve su equipo (escala el control). **(requisito de los líderes)**
- **G. Extras**: transcripción de audios, predicciones (tiempo a 1ª venta, forecast, abandono), educación financiera/retiro automatizada.

---

## 4. Preguntas a validar con el cliente

### 🔴 Bloqueantes (primero)
- **WhatsApp**: ¿consigue **número descartable** dedicado? ¿Es admin de los grupos? ¿Acepta que los agentes escriban a un número del sistema?
- **WFG**: ¿qué data provee (producción/ventas/comisiones)? ¿Se exporta? ¿Tiene API? ¿Formato?
- **Planilla de los 2.000**: ¿la tiene en Excel/sistema? ¿La pasa? (para el importador CSV)
- **Zoom**: ¿plan? ¿es admin (para la app de API)? ¿cuántas personas por reunión (máx)? ¿los agentes entran logueados con su email?
- **Material de capacitación**: ¿dónde está hoy? (Drive/YouTube/WhatsApp)

### Grupos de WhatsApp (observado, a confirmar)
Tres grupos vistos: **Team Excel Lead**, **Team ExcelLead Licensed**, **General Licensed Forum**. Los de equipo con poca participación; el foro general "al día" pero no se sabe si se escribe o es solo anuncios.
Por cada grupo validar: **cuánta gente · si son SUS agentes · si se escribe o es broadcast · tipo de mensajes · si capturarlo · si ella es admin.**

### Día / semana
- Día típico de punta a punta (qué mira primero). Celular vs compu. Qué le roba más tiempo.
- Semana típica: cuántas reuniones y de qué tipo; recurrentes vs sobre la marcha. ¿Trabaja sola o con líderes/asistentes?

### Onboarding / clientes / agentes
- Proceso real de entrada de agente → **primera venta** → **qué sigue después**. Cuánto tarda en promedio.
- Cómo organiza a los 2.000 (líder/equipo/fecha/producto — **no asumir "zonas"**). Jerarquía: cuántos líderes, cuántos por líder.
- Alta/baja de agentes (quién carga, frecuencia, cómo se entera de bajas).
- Cartera: cómo sigue a los clientes hoy, renovaciones, oportunidades.

### Objetivos / operativo
- Cómo mide si un agente va bien (meta). Qué debería pesar en el **Score**.
- Idioma (es/en/ambos). Nivel técnico de agentes. Privacidad (datos financieros, EE.UU.).
- Hosting/dominio. ¿IA real (Gemini, API key)? Presupuesto y plazos. Quién decide/paga. Cuántos líderes usan el panel.

---

## 5. Decisiones / próximos pasos
1. Conseguir respuestas 🔴 (número, WFG, planilla, Zoom, material).
2. Construir **Feature A** (asistente que actúa) para la presentación.
3. Planificar **multi-líder** (dashboard segmentado por líder).
4. Conectar WFG (Paso 0) cuando se sepa el formato.

Fin.
