# Arquitectura de Alertas y Comunicación - MentorComercial

**Documento Crítico:** Define cómo se comunican urgencias, tareas y pendientes  
**Aplicable a:** Cecilia (supervisor) + Agentes (ejecutores)  
**Principio:** Claridad radical, urgencia visible, tareas priorizadas

---

## Filosofía Central

> Cecilia y sus agentes abren MentorComercial y en 3 segundos saben:
> 1. ¿Qué necesito hacer YA?
> 2. ¿Qué es urgente hoy?
> 3. ¿Qué va bien?

**No hay navegación. No hay búsqueda. Es todo visible.**

---

## Matriz de Urgencia

### Definición de Niveles

```
NIVEL     COLOR   RANGO TEMPORAL    DEFINICIÓN                          ACCIÓN
────────────────────────────────────────────────────────────────────────────────
URGENTE  🔴     Próximas 2h       Requiere atención INMEDIATA         Notificación push
                                   en las próximas 2 horas              + llamada/mensaje

HOY      🟠     Próximas 8h       Debe resolverse antes de dormir     Notificación push
                                                                        + recordatorio a las 10am

SEMANA   🟡     Próximos 7 días   Puede programarse en la semana       Recordatorio diario
                                                                        + sumario semanal

ON-TRACK 🟢     Cumplido/OK       Está progresando bien               Reconocimiento
                                   No requiere acción                   (insignia/motivación)

BLOQUEADO ⚫     Indefinido        Se perdió de vista, requiere        Escalada a Cecilia
                                   decisión superior
```

---

## Para CECILIA (Supervisor)

### Dashboard Principal - Pantalla de Entrada

**Cuando Cecilia abre MentorComercial:**

```
┌─────────────────────────────────────────┐
│ Buenos días Cecilia - Lunes 2 de Julio  │
│ 6 cosas que necesitas saber HOY         │
├─────────────────────────────────────────┤
│                                         │
│ 🔴 URGENTE - Próximas 2h                │
│ ├─ 3 agentes sin actividad > 24h        │
│ │  → Llamarlos YA, riesgo abandono      │
│ ├─ Reunión de líderes hace 30min        │
│ │  → 2 asuntos acordados sin asignar    │
│ └─ 1 cliente alto valor "perdido"       │
│    → Asignar a alguien hoy              │
│                                         │
│ 🟠 HOY - Próximas 8h                    │
│ ├─ Capacitación Equipo Sur a las 3pm    │
│ │  → 5 agentes nuevos deben asistir     │
│ ├─ 8 agentes sin asignar tareas         │
│ │  → Planificar actividades             │
│ └─ Revisar Score de agentes en baja     │
│    → 7 están en riesgo (score < 40)     │
│                                         │
│ 🟢 BIEN - Sigue así                     │
│ └─ Equipo Norte: +15% productividad     │
│    → Reconocer a líderes (enviar msg)   │
│                                         │
└─────────────────────────────────────────┘

[Ver todo]  [Acciones rápidas]  [Descartar]
```

---

### Tareas de Cecilia (Sistema de Pendientes)

**Para cada urgencia, acciones claras:**

#### 🔴 URGENTE - Agentes Sin Actividad

```
Acción Recomendada:
┌────────────────────────────────────┐
│ "Llamar a Juan Pérez"              │
│ Inactivo hace: 28 horas            │
│ Último acceso: Domingo 5pm         │
│ Score: 35/100 (🔴 RIESGO)          │
│ Razón: Está en Paso 3 Onboarding   │
│        (se atascó)                 │
│                                    │
│ [Llamar vía Zoom]  [Enviar WhatsApp]│
│ [Enviar material]  [Anotar seguimiento]
│                                    │
│ Historial:                         │
│ • 25 jun: Capacitación faltó       │
│ • 23 jun: Última venta intentada   │
│ • 21 jun: Asignado a Equipo Sur    │
└────────────────────────────────────┘
```

**Efecto:** Cecilia toca un botón y hace seguimiento. El sistema registra cuándo contactó, para qué, resultado.

---

#### 🟠 HOY - Agentes por Asignar Tareas

```
Acciones del Día:
┌────────────────────────────────────┐
│ Equipo Sur - 5 agentes nuevos       │
│ Tareas disponibles para hoy:        │
│                                    │
│ □ Contactar 5 prospectos          │
│   Duración: ~1 hora               │
│   Dificultad: Baja                │
│   Asignados: 0 agentes            │
│   → ASIGNAR A: [ select ]          │
│                                    │
│ □ Presentación venta (simulada)   │
│   Duración: 30 min                │
│   Dificultad: Media               │
│   Asignados: 0 agentes            │
│   → ASIGNAR A: [ select ]          │
│                                    │
│ □ Revisión de CRM                │
│   Duración: 20 min                │
│   Dificultad: Baja                │
│   Asignados: 0 agentes            │
│   → ASIGNAR A: [ select ]          │
│                                    │
│ [Auto-distribuir]  [Personalizar] │
└────────────────────────────────────┘
```

---

### Sistema de Recordatorios para Cecilia

**Notificaciones push a horarios estratégicos:**

```
09:00 AM  "Cecilia, buenos días. Hoy tienes 6 cosas urgentes."
          → Dashboard principal

11:30 AM  "Recordatorio: Capacitación Equipo Sur en 1.5h"
          → Ir a detalles de capacitación

02:00 PM  "¿Ya hiciste seguimiento a Juan? (sin actividad 28h)"
          → Marca como hecho o pospone

04:00 PM  "Cierre del día: 3 agentes SIN tareas asignadas"
          → Ver lista, planificar mañana

06:00 PM  "Resumen del día: 15 agentes contactados, 2 alertas pendientes"
          → Revisar mañana o resolver hoy

08:00 PM  "Mañana: Revisión semanal de Score. Planifica 30min."
          → Prepararse
```

**Nota:** Todos los recordatorios son accionables (no solo "info"). Cada uno tiene un botón directo.

---

## Para AGENTES (Ejecutores)

### Dashboard Principal del Agente

**Cuando el agente abre MentorComercial:**

```
┌─────────────────────────────────────┐
│ Hola María - Tu Jornada Hoy         │
│ Lunes 2 de Julio                    │
├─────────────────────────────────────┤
│                                     │
│ 🔴 URGENTE HOY                      │
│ └─ Finalizar práctica de ventas     │
│    Vencimiento: HOY 5pm             │
│    Tiempo restante: 6 horas         │
│    Progreso: 80% ✅                 │
│    [Terminar ahora]  [Necesito ayuda]
│                                     │
│ 🟠 HOY - Tu agenda                  │
│ ├─ 10:00am - Capacitación inicial   │
│ │  Duración: 90 minutos             │
│ │  [Entrar a Zoom] [Recordar]       │
│ ├─ 12:00pm - Contactar 5 prospectos│
│ │  Tareas: 5 contactos en lista     │
│ │  [Ver lista] [Reportar avance]    │
│ └─ 03:00pm - Descanso               │
│                                     │
│ 🟡 ESTA SEMANA                      │
│ └─ Completar Paso 4 del roadmap    │
│    Paso 4: "Presentación Venta"    │
│    Progreso: 0/3 sesiones          │
│    [Ver detalles]                  │
│                                     │
│ 🟢 ¡LO ESTÁS HACIENDO BIEN!         │
│ └─ Asistencia perfecta esta semana │
│    Insignia: "Comprometido" 🏅    │
│                                     │
└─────────────────────────────────────┘

[Ir a Mi Roadmap]  [Ver todas las tareas]
```

---

### Roadmap de Onboarding (Tareas Secuenciadas)

**Cada paso es UNA tarea, clara y temporal:**

```
🎯 Tu Camino a la Primera Venta

Progreso: 35% - Vas muy bien ✅

┌──────────────────────────────────┐
│ ✅ PASO 1 - Perfil              │
│    Completado: 30 Jun            │
│    Tiempo: 15 minutos            │
│    Insignia: "Iniciado" 🏅       │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ✅ PASO 2 - Bienvenida          │
│    Completado: 30 Jun            │
│    Tiempo: 20 minutos            │
│    Insignia: "Conectado" 🏅      │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ✅ PASO 3 - Productos           │
│    Completado: 1 Jul             │
│    Tiempo: 45 minutos            │
│    Quiz: 9/10 ✅                 │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 🔴 PASO 4 - Capacitación Inicial │
│    VENCE HOY A LAS 5PM           │
│    Tiempo requerido: 90 minutos   │
│    Estado: PENDIENTE              │
│    Zoom Link: [Entrar]            │
│    [Confirmar asistencia]         │
│                                  │
│    ⚠️ ¡Si faltas, se reprograma! │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ⬜ PASO 5 - Práctica            │
│    Comienza: Mañana              │
│    Duración: 60 minutos          │
│    Con: Coach de Equipo          │
│    [Prepararse]                  │
└──────────────────────────────────┘

[Ver material de apoyo] [Preguntas frecuentes]
```

---

### Sistema de Tareas Diarias del Agente

```
TUS TAREAS DE HOY
═════════════════════════════════════

🔴 ANTES DE LAS 5PM
├─ Terminar práctica de ventas
│  Progreso: 80% completado
│  Tiempo restante: 6 horas
│  [Continuar]
│
└─ Asistir a capacitación 10:00am
   Estado: No confirmado
   [Confirmar en Zoom]

🟠 DURANTE EL DÍA
├─ Contactar 5 prospectos
│  Método: Llamada / WhatsApp
│  Tiempo estimado: 30 minutos
│  [Ver lista de contactos]
│
└─ Registrar resultados
   [Ingreso rápido]

🟡 CUANDO TERMINES
└─ Enviar reporte de actividad
   Formato: Automático (se envía a las 5pm)
   [Ver plantilla]

═════════════════════════════════════
Progreso de hoy: 2/5 completadas ✅
```

---

### Recordatorios para Agentes

**Inteligentes y motivadores:**

```
09:00 AM  "María, ¡buenos días! Tienes 5 tareas hoy. ¿Empezamos?"

10:00 AM  "En 5 minutos comienza la capacitación. ¿Listo?"

12:30 PM  "Vamos a la mitad del día. ¿Contactaste los 5 prospectos?"
          (Si no: "¿Necesitas ayuda? Escribe aquí 👇")

03:00 PM  "2 horas para terminar la práctica de ventas. ¡Puedes!"
          (Barra de progreso 80% / 100%)

04:50 PM  "¡ÚLTIMO RECORDATORIO! Práctica vence en 10 minutos."
          (Botón rojo, urgencia visual)

05:15 PM  "¡Lo hiciste! Práctica completada 🎉"
          (Insignia, reconocimiento)

05:30 PM  "Tu reporte se envió automáticamente. ¡Buen trabajo hoy!"
```

---

## Arquitectura Técnica de Alertas

### Niveles de Distribución

```
GENERACIÓN DE ALERTA
    ↓
┌─────────────────────────┐
│ Evaluar urgencia + tipo │
└─────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ 🔴 URGENTE (próx 2h)                 │
│ ├─ Push Notification (immediate)     │
│ ├─ WhatsApp (si integrado)           │
│ └─ Dashboard badge (rojo pulsante)   │
├──────────────────────────────────────┤
│ 🟠 HOY (próx 8h)                     │
│ ├─ Push Notification (scheduled)     │
│ ├─ Dashboard badge (naranja)         │
│ └─ Recordatorio en horarios clave    │
├──────────────────────────────────────┤
│ 🟡 SEMANA (próx 7 días)              │
│ ├─ In-app notification               │
│ ├─ Dashboard (subtil)                │
│ └─ Sumario semanal por email         │
└──────────────────────────────────────┘
```

### Lógica de Generación

**Alertas se generan por:**

1. **Inactividad:** Agente sin acceso > X horas
2. **Incumplimiento:** Capacitación vencida, objetivo no cumplido
3. **Progreso:** Agente completó un hito, merece reconocimiento
4. **Riesgos:** Score < 40, tendencia a baja
5. **Oportunidades:** Cliente alto valor, agente preparado para venta
6. **Tareas vencidas:** Checklist no completado al final del día

**Cada alerta:**
- ✅ Tiene acción clara (no es solo info)
- ✅ Tiene prioridad temporal
- ✅ Es accionable en 1-2 taps
- ✅ Se registra automáticamente

---

## Dashboard de Resumen (Para Ambos)

### Vista Semanal de Pendientes

```
SEMANA: 29 Jun - 5 Jul

CECILIA VE:
═════════════════════════════════════
Urgencias completadas: 18/22 (82%)
Agentes contactados: 156/180 (87%)
Tareas diarias asignadas: 285
Capacitaciones: 12 realizadas, 2 faltaron

Equipo con riesgo: 7 agentes (score < 40)
Equipo saludable: 1.993 agentes ✅

ACCIÓN PENDIENTE:
- Revisar 7 agentes en riesgo (30min tarea)
- Seguimiento con 2 que faltaron (15min)
- Reconocimiento a Equipo Norte (+15% productividad)

═════════════════════════════════════

AGENTE VE:
═════════════════════════════════════
Tareas completadas esta semana: 28/30 (93%)
Asistencia a capacitaciones: 5/5 (100%) ✅
Progreso en roadmap: 35% (Paso 3/8)
Score personal: 82/100 (🟢 SALUDABLE)

Próxima meta: Paso 4 "Capacitación Inicial"
Tiempo estimado: HOY

RECONOCIMIENTOS:
✅ Asistencia perfecta esta semana
🏅 Insignia: "Comprometido"
💬 Mensaje de tu líder: "María, ¡vamos bien! Sigue así"

═════════════════════════════════════
```

---

## Casos de Uso: Cómo Funciona en Vivo

### Caso 1: Cecilia - Urgencia de Agente Inactivo

```
EVENTO: Juan Pérez sin acceso hace 28 horas

SISTEMA GENERA:
1. Alerta interna (base de datos)
2. Push notification (urgente) → 🔴 "Juan no activo 28h"
3. WhatsApp (si está activado) → "Cecilia, Juan necesita contacto YA"
4. Dashboard badge rojo pulsante
5. Prioridad #1 en lista de Cecilia

CECILIA ABRE LA APP:
1. Ve el dashboard principal
2. "🔴 URGENTE: Juan Pérez sin actividad"
3. Toca → Ve detalles + acciones rápidas
4. Elige: [Llamar] [WhatsApp] [Enviar material]
5. El sistema registra automáticamente:
   - Hora de contacto
   - Método de contacto
   - Nota (si agrega)
6. Cambio de estado → Ya no es urgente

RESULTADO EN DASHBOARD:
- Urgencia marcada como "contactada"
- Fecha/hora registrada
- Si Juan responde: se cierra la alerta
- Si no responde: escala a "crítica" después de X horas
```

---

### Caso 2: Agente Nuevo - Tarea Vencida

```
EVENTO: María tiene práctica de ventas que vence HOY 5pm

SISTEMA GENERA:
1. 09:00am: Recordatorio suave → "Tienes 8 horas para terminar"
2. 12:00pm: Recordatorio medio → "María, no olvides la práctica"
3. 04:00pm: 🔴 CRÍTICO → "¡ÚLTIMA HORA! Práctica vence en 60min"
4. Dashboard muestra barra roja pulsante
5. Push notification cada 15 minutos

MARÍA VE EN SU DASHBOARD:
- Progreso visual: 80% → 100%
- Tiempo restante: 60 minutos (rojo)
- Botón grande: [TERMINAR AHORA]
- Si necesita ayuda: Chat con coach disponible

ESCENARIO 1: Completa a tiempo
- 04:55pm: "¡Completada! 🎉" + Insignia
- Sistema registra: completada, +5min antes del límite
- Reconocimiento automático: "Eres confiable"

ESCENARIO 2: No completa a tiempo
- 05:05pm: "Práctica vencida. Reprogramada para mañana."
- Cecilia recibe alerta: "María no completó práctica"
- Cecilia ve recomendación: "¿Necesita apoyo? Score: 42 (⚠️)"
- Cecilia puede: [Contactar] [Enviar material] [Dar más tiempo]
```

---

## Integración con Comunicación Externa

### WhatsApp (Opcional en MVP, Core en Fase 2)

**Cecilia recibe:**
```
🔴 MentorComercial Alert:
Juan Pérez sin actividad hace 28h
Riesgo: Abandono inminente
[Llamar] [WhatsApp] [Ver detalles]
```

**Agente recibe:**
```
María, recordatorio 📌
Tu práctica de ventas vence HOY a las 5pm
Llevas 80% completada ✅
¡Puedes terminar en 1 hora!
[Ver aplicación]
```

### Email (Sumarios)

```
CECILIA - Resumen Diario (4:00pm):
═════════════════════════════════════
📊 Día de hoy:
- 156 agentes activos
- 18 contactados por inactividad
- 1 nuevo en abandono riesgo
- 3 cumplieron meta (felicitar mañana)

⚠️ Pendientes para mañana:
- Revisión de Equipo Sur
- Seguimiento a agente en riesgo

✅ Bien hecho hoy:
- 95% de alertas procesadas

═════════════════════════════════════

AGENTE - Resumen Semanal (Viernes 5pm):
═════════════════════════════════════
🎯 Tu progreso esta semana:
- Tareas completadas: 28/30
- Asistencia: 5/5 ✅
- Score: 82/100 (SALUDABLE)

🏅 Reconocimientos:
- Asistencia perfecta
- Progreso en roadmap

📈 Próximo paso:
- Paso 4: Capacitación Inicial (lunes)

═════════════════════════════════════
```

---

## Principios de Implementación

### 1. Push Notification (No Spam)
- ❌ No enviar > 3 notificaciones/día por defecto
- ✅ Sí enviar si es 🔴 URGENTE (inmediato)
- ✅ Sí enviar recordatorios programados (1x día)

### 2. Fatiga de Alertas
- ❌ No mostrar 10 alertas al abrir la app
- ✅ Mostrar top 3 urgencias + "Ver más"
- ✅ Agrupar alertas similares ("3 agentes sin actividad")

### 3. Cumplimiento de Tareas
- ✅ Registrar automáticamente las completadas
- ✅ Marcar como hecho al hacer acción
- ✅ Reconocer progreso

### 4. Escalada Temporal
- Día 1: Alerta simple
- Día 2: Recordatorio
- Día 3: Crítica
- Día 4: Escalada a líder superior (si aplica)

---

## Métricas de Éxito: Alertas

### Para Cecilia
- ✅ % de urgencias contactadas dentro de 2h
- ✅ Tiempo promedio de respuesta a alerta
- ✅ Agentes recuperados de inactividad (%)
- ✅ Reducción de olvidos documentados

### Para Agentes
- ✅ % de tareas completadas antes del vencimiento
- ✅ Tiempo promedio de respuesta a recordatorio
- ✅ Retención (baja de abandono)
- ✅ Satisfacción (NPS)

---

## Ejemplo de Mock-up: Dashboard Cecilia - Versión Final

```
╔════════════════════════════════════════════════════════════╗
║            MENTORCOMERCIAL - CECILIA                      ║
║         Lunes 2 de Julio, 09:15 AM                        ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🔴 6 COSAS URGENTES AHORA (próximas 2h)                  ║
║  ════════════════════════════════════════════             ║
║  1. Juan Pérez - SIN ACTIVIDAD 28h                        ║
║     → [Llamar]  [WhatsApp]  [Mensaje]                    ║
║  2. Reunión Líderes - 2 asuntos sin asignar              ║
║     → [Ver detalles]  [Asignar]                          ║
║  3. Cliente ABC alto valor - "En suspenso"               ║
║     → [Reasignar]  [Contactar]                           ║
║                                                            ║
║  🟠 8 COSAS HOY (próximas 8h)                             ║
║  ════════════════════════════════════════════             ║
║  • Capacitación Equipo Sur 3pm (5 nuevos)                ║
║  • 8 agentes sin tareas → asignar                        ║
║  • Revisar agentes en riesgo (score < 40)                ║
║                                                            ║
║  🟢 BIEN - LO ESTÁS HACIENDO                              ║
║  ════════════════════════════════════════════             ║
║  • Equipo Norte: +15% productividad                      ║
║    → [Felicitar líderes]                                 ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  [Ir a todas las tareas] [Acciones rápidas] [Descartar]  ║
╚════════════════════════════════════════════════════════════╝
```

---

## Documento Vivo

Este documento define la "experiencia de urgencia" de MentorComercial.

**Todas las decisiones de diseño deben referenciarse a estos principios:**
1. Urgencia visible
2. Tareas claras
3. Una cosa a la vez
4. Accionable en 1-2 taps

**Próxima revisión:** Post-Fase 1 (Feedback real de Cecilia)

---

Fin de documento.
