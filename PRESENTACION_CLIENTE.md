# Asistente Comercial — Propuesta y Visión

**Para:** presentación al cliente
**Versión:** 1.0 · Junio 2026
**Estado:** Prototipo navegable + plan de desarrollo por fases

> *Nombre de trabajo: "Asistente". El nombre comercial final se define con el cliente.*

---

## 1. En una frase

**Un asistente que le dice al líder comercial qué hacer hoy y le deja operar a todo su equipo desde un solo lugar — fácil, desde el celular.**

No es un CRM ni una plataforma de cursos. Es un **sistema operativo para líderes comerciales** que gestionan equipos grandes.

---

## 2. El problema que resolvemos

El líder comercial (perfil: gestiona ~1.300 agentes) **se ahoga**:

- Le llega todo por WhatsApp y no da abasto → se le pierden cosas importantes.
- No sabe **quién está por abandonar** ni **a quién ayudar primero**.
- El **onboarding de agentes nuevos es lento** y no ve dónde se traban.
- Gestiona de memoria y a pulmón → estrés, olvidos, no escala.

> **No necesita más información. Necesita saber dónde actuar hoy.**

---

## 3. La solución: cómo se siente usarlo

Tres ideas guían todo el producto:

1. **Urgencia visible** — al abrir, ve *qué hacer ahora*, priorizado por color (🔴🟠🟡🟢).
2. **Acción directa** — opera todo desde el tablero (responder, llamar, asignar, reconocer), como una billetera virtual.
3. **Simplicidad radical** — una cosa a la vez, pensado para alguien sin perfil técnico.

Y un cambio de enfoque clave: el corazón es una **bandeja inteligente de WhatsApp** — capturamos lo que entra, lo ordenamos por urgencia, y el líder responde desde la app. Cada mensaje, además, alimenta el sistema.

### Los 3 pilares
- **CONTROL** — ver de un vistazo el estado de todo el equipo (Score por agente, 0–100).
- **SEGUIMIENTO** — convertir datos en acciones: a quién llamar, a quién ayudar, quién se va.
- **DESARROLLO** — onboarding tipo "juego" hacia la primera venta.

---

## 4. Lo que YA se puede ver hoy (prototipo navegable)

Hay un prototipo clickeable de las pantallas principales. Esto ya existe y se puede mostrar:

### App del Líder
| Pantalla | Qué hace |
|---|---|
| **Acceso** | Login simple · multi-idioma (🇺🇸 EN / 🇪🇸 ES / 🇧🇷 PT) · ingreso por código de WhatsApp |
| **Mi Día** | Línea de tiempo del día (qué falta y a qué hora) + resumen del equipo + **acciones inmediatas** + lista de tareas priorizadas (modo guiado paso a paso) |
| **Bandeja** | Todos los mensajes de WhatsApp triados (🔴 urgente / 🟠 puede esperar / ✅ respondido) con respuesta rápida |
| **Agentes** | Lista ordenada por urgencia, filtros por Score y situación, comunicación integrada |
| **Detalle de agente** | Score desglosado, ruta de onboarding, **hilo único** (WhatsApp + app), historial y acciones |
| **Onboarding** | Embudo de los pasos y quién se trabó camino a la primera venta |

### App del Agente
| Pantalla | Qué hace |
|---|---|
| **Hoy** | Su tarea urgente, agenda del día, próximo hito, reconocimientos |
| **Agenda** | Su calendario (hoy / mañana / semana) con horarios y accesos a Zoom |
| **Ruta de aprendizaje** | Camino de 8 pasos estilo "juego" hacia la primera venta, con material por paso |
| **Progreso** | Su Score, métricas, racha y avance |
| **Logros** | Insignias y ranking del grupo |
| **Chat con su líder** | Conversación directa |

> *Importante: el prototipo muestra la experiencia con datos de ejemplo. Todavía no está conectado a una base de datos ni a sistemas reales (eso es parte del desarrollo).*

---

## 5. Cómo funciona por dentro (el circuito)

```
  Mensajes (WhatsApp) · actividad · Zoom · producción
                    │
                    ▼
        El sistema CALCULA automáticamente
        (Score de cada agente + alertas priorizadas)
                    │
                    ▼
   El líder ve "qué hacer hoy" y ACTÚA en 1–2 toques
                    │
                    ▼
        Todo queda REGISTRADO en el historial
                    │
                    └──► y vuelve a alimentar el sistema
```

El **Score de Agente (0–100)** resume a cada persona en un solo número, compuesto por: Actividad, Asistencia a capacitaciones, Cumplimiento de objetivos e Interacción.

---

## 6. Hacia dónde vamos — Roadmap por fases

| Fase | Foco | Incluye |
|---|---|---|
| **Fase 0 · Descubrimiento** *(en curso)* | Validar lo que aún no sabemos | Acceso a datos, estructura del equipo, número de WhatsApp, definición de la agenda |
| **Fase 1 · MVP** | El control, el seguimiento y el onboarding funcionando | Dashboard + Score + Bandeja + Alertas + Onboarding + apps líder/agente, conectados a base de datos real |
| **Fase 2 · Automatización** | Que los datos entren solos | WhatsApp Business API (bandeja real), asistencia automática por Zoom, datos de producción (WFG), notificaciones push, mensajes masivos reales |
| **Fase 3 · Inteligencia (IA)** | Potenciar con IA | Asistente comercial 24/7 para agentes, simulador de ventas, motor predictivo de abandono, resúmenes automáticos de reuniones |

> El valor se entrega temprano: la **Fase 1 ya resuelve ~80% del dolor sin IA**. La IA se suma después como ampliación.

---

## 7. Lo que todavía falta (y por qué importa)

### a) Conectar con el mundo real (integraciones)
- **WhatsApp Business API** → para capturar y responder mensajes de verdad.
- **Zoom** → asistencia automática a capacitaciones.
- **WFG** → producción, ventas y comisiones (alimenta el KPI "tiempo a primera venta").
- **Notificaciones push** → entregar las alertas.

### b) Construir el backend
El prototipo es la "cara". Falta la "máquina": base de datos, el motor que calcula el Score y genera las alertas, y la seguridad (datos financieros → región de EE.UU., privacidad).

### c) Definir la plataforma
Decidir si la app va en las tiendas (App Store / Play Store) o como app web instalable. Esto define el camino técnico.

### d) Completar el multi-idioma
El login ya lo demuestra; falta extenderlo a toda la app (inglés por defecto + idiomas que sumemos).

---

## 8. Qué necesitamos del cliente para avanzar

Para cerrar la **Fase 0** necesitamos validar con vos:

1. **¿Cómo es tu día y cómo manejás tu agenda hoy?** (calendario, reuniones, recordatorios)
2. **¿Cómo se organizan tus ~1.300 agentes?** (por líder, por cohorte, por producto…)
3. **¿A qué número de WhatsApp te escriben hoy?** (define cómo capturamos los mensajes)
4. **¿Qué datos te da WFG y cómo accedés?** (define qué automatizamos)
5. **¿Cómo das de alta a un agente nuevo y qué datos tenés de cada uno?**

*(El listado completo de preguntas está preparado para una sesión de trabajo.)*

---

## 9. El recorrido en una línea

```
HOY                     FASE 1 (MVP)            FASE 2                  FASE 3
Prototipo navegable  →  Producto real      →   Todo automático    →   Con IA
(la experiencia)        conectado a datos       (WhatsApp/Zoom/WFG)     (predicción, asistente)
```

**Empezamos por lo que más duele y entrega valor rápido. Lo demás es ampliación, con un camino claro.**

---

*Documento vivo — se actualiza con el feedback del cliente y los avances del desarrollo.*
