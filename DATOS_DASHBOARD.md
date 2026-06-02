# Datos que alimentan el Dashboard - Asistente

**Qué es:** inventario de la información que necesita cada parte del dashboard para funcionar.
**Para qué sirve:** define el modelo de datos, qué se carga a mano vs qué se calcula, y qué integraciones hacen falta. Es la base para diseñar la base de datos y validar con el cliente (ver PREGUNTAS_DESCUBRIMIENTO.md).
**Estado:** 🟡 Borrador · 2026-06-02

---

## Leyenda de fuentes

| Símbolo | Fuente | Significado |
|---|---|---|
| 📝 | **Manual** | Lo carga una persona (líder o agente) |
| 📱 | **App** | Surge del uso de la propia plataforma |
| 💬 | **WhatsApp API** | Mensajes entrantes/salientes (WhatsApp Business API) |
| 📹 | **Zoom API** | Asistencia y reuniones |
| 🏦 | **WFG** | Producción / ventas / comisiones |
| ⚙️ | **Calculado** | Lo deriva el sistema (Score, alertas, agenda) — NO se carga |

> Regla clave: lo marcado ⚙️ **nunca se ingresa a mano** — se calcula a partir de los datos crudos. Esa es la inteligencia del sistema.

---

## PARTE A — Qué necesita cada parte del dashboard

### 1. Resumen general (las tarjetas de arriba)
| Dato que muestra | Lo necesita de… | Fuente |
|---|---|---|
| Total de agentes activos | Conteo de agentes con estado activo | 📝 alta / 🏦 |
| # Críticos / Atención / Saludables | Banda de Score de cada agente | ⚙️ |
| Mensajes sin responder | Conversaciones con último mensaje entrante sin respuesta | 💬 |
| Tiempo a 1ª venta (promedio) | Fecha 1ª venta − fecha ingreso, promediado | ⚙️ (de 🏦 + 📝) |

### 2. Línea de tiempo del día
| Dato | Lo necesita de… | Fuente |
|---|---|---|
| Eventos con hora (capacitaciones, reuniones, 1-1) | Agenda / calendario | 📝 / 📹 |
| Deadlines y recordatorios | Tareas y alertas con vencimiento | ⚙️ / 📝 |
| Estado de cada evento (hecho/pendiente) | Registro de la acción | 📱 / ⚙️ |
| Marcador "ahora" | Hora actual del dispositivo | 📱 |

### 3. Mi Día (acciones priorizadas) y Notificaciones
| Dato | Lo necesita de… | Fuente |
|---|---|---|
| Lista de acciones de hoy | **Alertas generadas** por reglas | ⚙️ |
| Por cada alerta: tipo, agente, urgencia (🔴🟠🟡🟢), motivo, acción sugerida, hora, estado | Motor de alertas | ⚙️ |

### 4. Acciones inmediatas (mensaje masivo, tarea grupal, capacitación)
| Dato | Lo necesita de… | Fuente |
|---|---|---|
| Segmentos para filtrar (críticos, nuevos, etc.) | Score + situación de agentes | ⚙️ |
| Plantillas de mensaje | Catálogo de plantillas | 📝 |
| Datos de contacto para enviar | WhatsApp / push de cada agente | 📝 / 💬 |

### 5. Bandeja / Inbox de WhatsApp
| Dato | Lo necesita de… | Fuente |
|---|---|---|
| Mensajes entrantes: de quién, canal, texto, hora | Webhook de WhatsApp + chat interno | 💬 / 📱 |
| Estado: leído / respondido / pendiente | Registro de lectura y respuesta | 📱 |
| Hilo único por agente (entrante + saliente) | Historial de la conversación | 💬 / 📱 |
| Triage (urgente / espera / respondido) | Reglas sobre el mensaje + Score del agente | ⚙️ |

### 6. Agentes (grilla + filtros)
| Dato | Lo necesita de… | Fuente |
|---|---|---|
| Nombre, foto, datos de contacto | Ficha del agente | 📝 |
| Score (0–100) y banda | Motor de Score | ⚙️ |
| Métricas: Actividad, Asistencia, Cumplimiento, Interacción | Señales crudas (ver Parte B) | ⚙️ |
| Situación (inactivo, trabado, nuevo, a reconocer) | Reglas sobre las señales | ⚙️ |
| Última actividad (hace X h) | Último acceso / último evento | 📱 |
| Es nuevo + paso de onboarding | Progreso de onboarding | 📱 / 📝 |

### 7. Detalle de agente / Hilo único
| Dato | Lo necesita de… | Fuente |
|---|---|---|
| Todo lo de la grilla, más: | | |
| Desglose del Score (los 4 componentes con su valor) | Señales que componen cada métrica | ⚙️ |
| Roadmap de onboarding (paso actual, completados) | Progreso por paso | 📱 / 📝 |
| Hilo único completo (WhatsApp + app) | Conversación | 💬 / 📱 |
| Historial de interacciones (llamadas, mensajes, tareas, reconocimientos) | Registro de acciones | 📱 |
| Tareas asignadas y su estado | Tareas | 📝 / 📱 |

### 8. Onboarding (vista líder)
| Dato | Lo necesita de… | Fuente |
|---|---|---|
| Definición del roadmap (los pasos, en orden) | Catálogo de pasos | 📝 |
| Progreso de cada agente nuevo (paso actual, %) | Avance registrado | 📱 / 📝 |
| Conteo de agentes por paso (embudo) | Agregación de progresos | ⚙️ |
| Quién está trabado y hace cuánto | Tiempo en el mismo paso | ⚙️ |

---

## PARTE B — Modelo de datos (entidades y campos)

### Agente *(📝 mayormente)*
`id` · `nombre` · `foto` · `whatsapp` · `email` · `fecha_ingreso` · `estado` (activo/inactivo/suspendido) · `es_nuevo` · `agrupación` *(a definir — NO "zona"; ver PREGUNTAS §3)* · `líder_asignado`

### Señales de actividad *(📱 / 📹 / 🏦 → alimentan el Score)*
`último_acceso` · `días_activos_últimos_7` · `tareas_completadas` / `tareas_asignadas` · `capacitaciones_asistidas` / `convocadas` · `mensajes_intercambiados` · `producción_del_mes` *(🏦)*

### Score *(⚙️ calculado — no se ingresa)*
`valor` (0–100) · `banda` (🔴/🟠/🟢) · `tendencia` (↑↓) · y sus 4 componentes:
- Actividad 30% · Asistencia 20% · Cumplimiento 30% · Interacción 20% *(pesos a validar con el cliente — PREGUNTAS §8)*

### Mensaje / Conversación *(💬 / 📱)*
`agente_id` · `dirección` (entrante/saliente) · `canal` (WhatsApp/app) · `texto` · `fecha_hora` · `estado` (recibido/leído/respondido)

### Capacitación / Evento de agenda *(📝 / 📹)*
`título` · `fecha_hora` · `duración` · `link_zoom` · `convocados[]` · `tipo` (grupal/1-1/reunión)

### Asistencia *(📹 manual MVP → automática Fase 2)*
`evento_id` · `agente_id` · `asistió` (sí/no) · `tiempo_permanencia`

### Tarea *(📝 / 📱)*
`título` · `asignado_a` (agente/segmento) · `vencimiento` · `estado` · `dificultad/duración`

### Alerta *(⚙️ generada por reglas)*
`tipo` (inactividad, capacitación vencida, objetivo vencido, hito, riesgo de Score, falta de seguimiento) · `agente_id` · `urgencia` · `acción_sugerida` · `estado` (nueva/vista/atendida/cerrada) · `fecha`

### Interacción / Historial *(📱 — se registra al ejecutar una acción)*
`agente_id` · `tipo` (llamada/mensaje/tarea/reconocimiento/zoom) · `fecha` · `autor` (líder) · `resultado/nota`

### Onboarding *(📝 definición + 📱 progreso)*
Definición: `pasos[]` (orden, nombre, material, duración estimada).
Progreso por agente: `paso_actual` · `% ` · `fecha_completado` por paso · `días_en_paso_actual`.

### Objetivo / Meta *(📝 MVP → 🏦 Fase 2)*
`agente_id` · `meta_mensual` · `progreso`

### Agenda *(⚙️ se arma de eventos + alertas)*
Combina Capacitaciones/Eventos + Alertas con vencimiento → bloques con hora que alimentan la línea de tiempo y "Mi Día".

---

## PARTE C — Qué se necesita por integración

| Integración | Qué aporta | Estado |
|---|---|---|
| 💬 **WhatsApp Business API** | Mensajes entrantes/salientes → Bandeja, hilo único, señal de interacción | 🔴 Definir número (PREGUNTAS §5) |
| 📹 **Zoom API** | Asistencia a capacitaciones → métrica Asistencia | MVP manual → auto Fase 2 |
| 🏦 **WFG** | Producción, ventas, 1ª venta → Cumplimiento, KPI tiempo a 1ª venta | 🔴 Acceso desconocido (PREGUNTAS §7) |
| 📲 **Push / notificaciones** | Entregar alertas | Según stack |

---

## PARTE D — Mínimo para el MVP vs después

**Imprescindible para que el dashboard tenga sentido en el MVP:**
- Ficha de Agente (📝) · Señales básicas de actividad (📱) · Score calculado (⚙️) · Alertas (⚙️) · Mensajes/hilo (💬+📱) · Onboarding (📝/📱) · Interacciones (📱).

**Puede entrar después (Fase 2):**
- Asistencia automática por Zoom (📹) · Producción y metas reales desde WFG (🏦) · Auto-respuestas del bot.

---

## Datos que todavía NO sabemos (bloquean parte de esto)
1. 🔴 **Estructura de agentes** — cómo se agrupan los 1300+ (no "zonas"). → PREGUNTAS §3
2. 🔴 **Número de WhatsApp** — define cómo capturamos los mensajes. → PREGUNTAS §5
3. 🔴 **Acceso a WFG** — define producción, ventas y el KPI principal. → PREGUNTAS §7
4. 🟡 **Pesos del Score** — confirmar con el cliente. → PREGUNTAS §8

---

Fin de documento.
