# Mockups de Pantallas - MentorComercial

**Documento de Diseño UI/UX - 20 Pantallas Principales**

Navegación:
- [Pantallas Cecilia (Supervisor)](#pantallas-cecilia-supervisor) (12 pantallas)
- [Pantallas Agentes (Ejecutores)](#pantallas-agentes-ejecutores) (8 pantallas)

---

## PANTALLAS DE ACCESO

---

### PANTALLA 0A: Login con Magic Link

**Ruta:** `/login`  
**Descripción:** Acceso sin contraseña. Ingresa email, recibes link mágico.

```
╔═════════════════════════════════════════════════════════════════════╗
║                                                                     ║
║                                                                     ║
║                     MENTORCOMERCIAL                                 ║
║                                                                     ║
║              Plataforma de Gestión de Equipos Comerciales          ║
║                                                                     ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  Ingresa tu email y te enviaremos un link mágico para acceder      ║
║                                                                     ║
║  Email: [cecilia@agencia.com_____________]                         ║
║                                                                     ║
║  ☑️ Recordar este dispositivo                                      ║
║                                                                     ║
║  [Enviar link mágico]                                              ║
║                                                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║  ¿No tienes cuenta? [Registrarte aquí]                            ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                     ║
║  Seguridad:                                                         ║
║  • Sin contraseña                                                   ║
║  • Acceso seguro vía email                                          ║
║  • Link válido por 24 horas                                         ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝

FLUJO:
1. Usuario ingresa email
2. Click [Enviar link mágico]
3. Sistema valida email y envía link
4. Usuario abre link en email
5. Autenticación automática
6. Redirecciona a dashboard
```

---

### PANTALLA 0B: Pantalla de Confirmación (Email Enviado)

**Ruta:** `/login/sent`  
**Descripción:** Confirmación después de solicitar link.

```
╔═════════════════════════════════════════════════════════════════════╗
║                                                                     ║
║                  ✅ LINK ENVIADO CORRECTAMENTE                     ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  Hemos enviado un link mágico a:                                   ║
║                                                                     ║
║      cecilia@agencia.com                                           ║
║                                                                     ║
║  ⏱️ El link es válido por 24 horas                                  ║
║  📧 No lo ves? Revisa SPAM                                         ║
║  📱 O abre directamente desde tu celular                           ║
║                                                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║  [Volver al login]  [Cambiar email]                                ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                     ║
║  El link abrirá automáticamente tu sesión.                         ║
║  No necesitas copiar nada.                                         ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝
```

---

### PANTALLA 0C: Registro de Usuario (Magic Link igual)

**Ruta:** `/signup`  
**Descripción:** Registrarse es igual de simple: email + magic link.

```
╔═════════════════════════════════════════════════════════════════════╗
║                                                                     ║
║  CREAR CUENTA EN MENTORCOMERCIAL                                   ║
║                                                                     ║
║  Es rápido. Solo necesitamos tu email.                             ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  Nombre Completo: [________________________]                        ║
║  Email: [cecilia@agencia.com_____________]                         ║
║  Rol: [Seleccionar ▼]                                               ║
║       □ Dueña / Administradora                                      ║
║       □ Líder de Equipo                                             ║
║       □ Agente / Ejecutor                                           ║
║                                                                     ║
║  Empresa/Agencia: [______________________]                         ║
║                                                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║  ☑️ Acepto términos y política de privacidad                       ║
║  ☑️ Deseo recibir noticias y actualizaciones                       ║
║                                                                     ║
║  [Crear cuenta y enviar link mágico]                               ║
║                                                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║  ¿Ya tienes cuenta? [Inicia sesión aquí]                          ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝

POST REGISTRO:
- Sistema valida email
- Envía magic link
- Redirige a "Link Enviado"
- Usuario confirma email
- Se abre dashboard
```

---

### PANTALLA 0D: Dashboard Operativo (Post-Login)

**Ruta:** `/dashboard` (primera pantalla después del login)  
**Descripción:** Centro de operaciones. TODO lo que necesita está aquí.

```
╔═════════════════════════════════════════════════════════════════════╗
║                      MENTORCOMERCIAL                                ║
║              Centro de Operaciones Comerciales                      ║
║                                                                     ║
║  👋 Hola Cecilia | Estado: En línea 🟢 | Ayer: 1.993 agentes      ║
║                                                                     ║
║  [☰ Menú]  [🔔 2]  [⚙️]  [👤 Cecilia ▼]                            ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  📊 OPERACIONES - ESTADO ACTUAL                                     ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  🔴 CRÍTICO - Requiere acción inmediata                            ║
║  ────────────────────────────────────────────────────────────    ║
║  • 3 agentes sin actividad > 24h                                  ║
║  • 2 asuntos vencidos de reunión de líderes                      ║
║  • 1 cliente alto valor "perdido"                                ║
║                                                                    ║
║  ┌──────────────────────────────────────────────────────┐         ║
║  │ [🔴 3] Juan Pérez, María García, Carlos López      │         ║
║  │ → [Contactar ahora]  [Ver todos]                   │         ║
║  └──────────────────────────────────────────────────────┘         ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟠 HOY - Acciones programadas                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  ⏰ 15:00 - Capacitación Equipo Sur (5 agentes nuevos)            ║
║     [Entrar a Zoom] [✓ Confirmado] [Recordar]                    ║
║                                                                    ║
║  📋 8 agentes sin tareas → Asignar actividades                    ║
║     Tiempo: ~30 min | [Asignar rápido]                           ║
║                                                                    ║
║  📍 Revisar 7 agentes en riesgo (Score < 40)                     ║
║     [Ver lista] [Crear plan grupal]                              ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟢 MÉTRICAS DEL DÍA                                               ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  Agentes activos hoy:     1.987 ✅                                ║
║  Contactos realizados:    156/180 (87%)                           ║
║  Tareas asignadas:        285/487 (59%)                           ║
║  Capacitaciones:          12/12 completadas (100%) 🏆            ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ⭐ SCORE DE EQUIPO                                                ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  Equipo Sur:   65.4/100  📈 +5.2%                                ║
║  Equipo Este:  72.1/100  📊 -2.1%                                ║
║  Equipo Oeste: 58.9/100  📉 -3.5%                                ║
║  Equipo Norte: 78.5/100  📈 +8.1% 🏆                             ║
║                                                                    ║
║  [Ver análisis]  [Exportar]                                       ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🎯 PRÓXIMAS ACCIONES RECOMENDADAS                                 ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  1. [URGENTE] Contactar 3 agentes inactivos - 5 min              ║
║  2. [HOY] Asignar tareas a 8 agentes - 30 min                    ║
║  3. [HOY] Revisar Equipo Oeste (baja productividad)              ║
║  4. [HOY] Reconocer a Equipo Norte (+8%)                         ║
║  5. [ESTA SEMANA] Capacitación para 5 nuevos agentes             ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🚀 ATAJO RÁPIDOS                                                  ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  [+ Nuevo Agente]  [📋 Ver Agentes]  [📊 Estadísticas]           ║
║  [🎯 Roadmap]      [💼 Equipos]      [⚠️ Alertas]                ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  💬 ÚLTIMAS INTERACCIONES                                           ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  • 11:30 - Contactaste a Juan Pérez por WhatsApp ✅              ║
║  • 11:00 - Asignaste "Contactar 5 prospectos" a 3 agentes ✅    ║
║  • 10:45 - Enviaste recordatorio de capacitación ✅              ║
║  • 10:30 - Revisaste lista de agentes en riesgo ✅               ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [👥 Equipo]  [📊 Dashboard]  [🔧 Operaciones]  [⚙️ Config]        ║
╚═════════════════════════════════════════════════════════════════════╝

CARACTERÍSTICAS:
- Centro de mando único
- TODO lo que necesita ver en una pantalla
- Acciones inmediatas resaltadas
- Recomendaciones automáticas
- Atajos a todas las funcionalidades
```

---

## PANTALLAS CECILIA (SUPERVISOR)

---

### PANTALLA 1: Dashboard Principal (Cecilia - Entrada)

**Ruta:** `/dashboard`  
**Descripción:** Primera pantalla al abrir la app. Resumen ejecutivo de todo lo que necesita saber HOY.

```
╔═════════════════════════════════════════════════════════════════════╗
║                      MENTORCOMERCIAL                                ║
║                  👋 Buenos días, Cecilia                            ║
║           Lunes 2 de Julio - 09:15 AM                              ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  6 COSAS URGENTES AHORA 🔴 (próximas 2 horas)                      ║
║  ═══════════════════════════════════════════════════════════════   ║
║  📍 Juan Pérez - SIN ACTIVIDAD 28h                                 ║
║    Score: 35/100 | Equipo: Sur | Riesgo: ABANDONO                ║
║    [Llamar]  [WhatsApp]  [Ver perfil]                             ║
║                                                                    ║
║  📍 2 Asuntos sin asignar - Reunión Líderes hace 30min             ║
║    • Promoción cliente "ABC Corp" - valor alto                   ║
║    • Plan nuevo de comisiones                                    ║
║    [Ver detalles]  [Asignar]                                      ║
║                                                                    ║
║  📍 Cliente XYZ "Perdido" - Última actividad: 15 días              ║
║    Reasignar o contactar hoy                                      ║
║    [Reasignar]  [Contactar]                                       ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  8 COSAS HOY 🟠 (próximas 8 horas)                                ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  📌 15:00 - Capacitación Equipo Sur (5 agentes nuevos)            ║
║     Link Zoom: [Entrar]  [Recordar]  [Detalles]                  ║
║                                                                    ║
║  📌 8 agentes sin tareas asignadas (requieren actividades)        ║
║     Tiempo: ~30 minutos para distribuir                           ║
║     [Ver lista]  [Auto-distribuir]                                ║
║                                                                    ║
║  📌 Revisar 7 agentes con Score < 40 (RIESGO)                     ║
║     Recomendación: Contacto personal hoy                          ║
║     [Ver lista de riesgo]                                         ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ✨ TODO BIEN 🟢 - ¡Sigue así!                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  🏆 Equipo Norte: +15% PRODUCTIVIDAD esta semana                  ║
║     Reconocer a: Carlos (líder) y 3 agentes destacados            ║
║     [Enviar felicitación]  [Ver detalles]                         ║
║                                                                    ║
║  🎯 15 agentes completaron meta del mes                           ║
║     Acción recomendada: Enviar bonus motivador                    ║
║     [Enviar mensaje grupal]                                       ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [≡ Menú]  [📊 Equipo]  [👥 Agentes]  [⚙️ Configuración]            ║
╚═════════════════════════════════════════════════════════════════════╝

FLUJO:
- Toca cualquier alerta → Va a detalles + acciones
- Toca [Ver lista] → Pantalla filtrada de esa categoría
- Toca [Llamar/WhatsApp] → Abre contacto directo
- Swipe hacia arriba → Ver alertas adicionales
```

---

### PANTALLA 2: Lista de Agentes (Búsqueda + Filtros)

**Ruta:** `/agents`  
**Descripción:** Listado de todos los agentes con búsqueda y filtros rápidos por estado.

```
╔═════════════════════════════════════════════════════════════════════╗
║                    MIS AGENTES (2.000)                              ║
║                                                                     ║
║  Búsqueda: [Juan...]                    [Filtros ▼]               ║
║                                                                     ║
║  🔴 Riesgo (7)  🟠 Atención (23)  🟢 Saludable (1.970)             ║
║                                                                     ║
║─────────────────────────────────────────────────────────────────── ║
║                                                                     ║
║  🔴 RIESGO (7 agentes)                                              ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  👤 Juan Pérez                    Score: 35/100  🔴 SIN ACTIVIDAD  ║
║     Equipo: Sur | Entrada: 21/06 | Inactivo: 28h                 ║
║     [Contactar]  [Detalles]  [Más ▼]                              ║
║                                                                    ║
║  👤 María García                  Score: 28/100  🔴 ATRASADA       ║
║     Equipo: Este | Entrada: 15/06 | Capacitación vencida          ║
║     [Contactar]  [Detalles]  [Más ▼]                              ║
║                                                                    ║
║  👤 Carlos López                  Score: 22/100  🔴 MUY BAJO       ║
║     Equipo: Oeste | Entrada: 10/06 | No progresa                  ║
║     [Contactar]  [Detalles]  [Más ▼]                              ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟠 ATENCIÓN (23 agentes)                                           ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  👤 Ana Martínez                  Score: 55/100  🟠 PROGRESANDO    ║
║     Equipo: Norte | Entrada: 18/06 | Paso 3/8                     ║
║     [Ver roadmap]  [Detalles]  [Más ▼]                            ║
║                                                                    ║
║  👤 Diego Ruiz                    Score: 62/100  🟠 CONSOLIDARSE   ║
║     Equipo: Sur | Entrada: 12/06 | Productividad media            ║
║     [Ver roadmap]  [Detalles]  [Más ▼]                            ║
║                                                                    ║
║  [Ver más...]                                                      ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟢 SALUDABLE (1.970 agentes)                                       ║
║                                                                    ║
║  Mostrando: Top 5 con mejor score                                  ║
║                                                                    ║
║  👤 Roberto Sánchez               Score: 98/100  🟢 EXCELENTE      ║
║  👤 Patricia López                Score: 96/100  🟢 EXCELENTE      ║
║  👤 Andrés Martín                 Score: 95/100  🟢 EXCELENTE      ║
║  👤 Carolina Díaz                 Score: 94/100  🟢 EXCELENTE      ║
║  👤 Fernando Cruz                 Score: 92/100  🟢 EXCELENTE      ║
║                                                                    ║
║  [Ver todos]  [Ver mejor score]  [Ver por equipo]                ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [📊 Estadísticas]  [➕ Agregar agente]                  ║
╚═════════════════════════════════════════════════════════════════════╝

INTERACCIONES:
- Filtros: Riesgo → Atención → Saludable (tabs)
- Búsqueda en tiempo real
- Toca agente → Pantalla 3 (Perfil detallado)
- Swipe para más opciones
```

---

### PANTALLA 3: Perfil del Agente (Detallado)

**Ruta:** `/agents/:id`  
**Descripción:** Vista completa de un agente con historial, roadmap, interacciones.

```
╔═════════════════════════════════════════════════════════════════════╗
║                      JUAN PÉREZ                                     ║
║                 Score: 35/100 🔴 RIESGO                             ║
║                                                                     ║
║  Equipo: Sur | Entrada: 21/06/2026 | Estado: Activo               ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  ⚠️ URGENTE - CONTACTAR HOY                                         ║
║  Sin actividad: 28 horas                                            ║
║  Último acceso: 01/07 - 17:30                                       ║
║  Capacitación: Incompleta                                           ║
║  [Llamar]  [WhatsApp]  [Enviar material]                           ║
║                                                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║  MÉTRICAS PERSONALES                                                ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  Actividad:        ████░░░░░░ 40%                                  ║
║  Asistencia:       ░░░░░░░░░░ 0%   (No asistió a capacitaciones)  ║
║  Cumplimiento:     █░░░░░░░░░ 10%  (1/10 tareas)                  ║
║  Plataforma:       ████░░░░░░ 45%  (Acceso irregular)             ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  PROGRESO - CAMINO A PRIMERA VENTA                                  ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  ✅ PASO 1: Crear perfil (30/06)                                   ║
║  ✅ PASO 2: Bienvenida (30/06)                                     ║
║  ⏳ PASO 3: Conocer productos (EN PROGRESO - 20%)                  ║
║      Tarea: Ver materiales de AIG                                 ║
║      Tiempo restante: 2 días                                      ║
║      [Ver material]  [Recordar]                                   ║
║                                                                    ║
║  ⬜ PASO 4: Capacitación inicial (FALTA)                            ║
║      Próxima sesión: 03/07 - 10:00am                              ║
║      [Recordar]  [Reprogramar]                                    ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  INTERACCIONES (Últimos 7 días)                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  01/07 - 15:00  Cecilia: "¿Cómo vas Juan?"                        ║
║                 Juan: "Bien, estudiando productos"                 ║
║                                                                    ║
║  01/07 - 10:30  Sistema: "Recordatorio capacitación mañana"       ║
║                                                                    ║
║  30/06 - 14:00  Cecilia: "Bienvenido al equipo"                   ║
║                 Juan: "Gracias! Listo para empezar"               ║
║                                                                    ║
║  [Ver historial completo]                                          ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ACCIONES                                                           ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  [Llamar]  [WhatsApp]  [Enviar mensaje]  [Editar]  [Más ▼]        ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [📋 Notas]  [📊 Estadísticas]                          ║
╚═════════════════════════════════════════════════════════════════════╝

DATOS QUE MUESTRA:
- Score actual y desglose
- Urgencias/alertas
- Progreso en roadmap
- Historial de interacciones
- Acciones rápidas
```

---

### PANTALLA 4: Acciones Rápidas de Contacto

**Ruta:** `/agents/:id/contact`  
**Descripción:** Modal/overlay de contacto directo (Llamar, WhatsApp, Mensaje).

```
╔═════════════════════════════════════════════════════════════════════╗
║              CONTACTAR A JUAN PÉREZ                                 ║
║            Score: 35/100 | Inactivo: 28h                           ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  RAZÓN DE CONTACTO (Selecciona):                                   ║
║                                                                     ║
║  🔴 ☑️ Inactividad > 24h                                            ║
║  ⬜ Motivación/Seguimiento                                          ║
║  ⬜ Problema específico                                             ║
║  ⬜ Asignar tarea                                                   ║
║  ⬜ Otro                                                            ║
║                                                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║  CANAL DE CONTACTO:                                                 ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  📱 WhatsApp:  +54 9 11 2345-6789                                  ║
║     Estado: Registrado, activo hoy 11:30                          ║
║     [Enviar WhatsApp]  [Copiar número]                            ║
║                                                                    ║
║  📞 Teléfono:  +54 11 2345-6789                                    ║
║     [Llamar]  [Programar llamada]                                  ║
║                                                                    ║
║  💬 Mensaje en app:                                                 ║
║     Último: 30/06 - 14:00                                          ║
║     [Enviar mensaje]                                               ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  TEMPLATE DE MENSAJE:                                               ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  "Hola Juan, te escribo porque vemos que no ingresaste desde      ║
║   ayer. ¿Todo bien? ¿Necesitas algo? Estoy acá para ayudarte.    ║
║   La próxima capacitación es el 03/07 a las 10am.                 ║
║   ¡Vamos, que vas muy bien!"                                      ║
║                                                                    ║
║  [Personalizar]  [Enviar]                                          ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  DESPUÉS DEL CONTACTO:                                              ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  ¿Cuál fue el resultado?                                            ║
║  □ Respondió positivamente                                         ║
║  □ Necesita ayuda (especificar)                                    ║
║  □ No respondió                                                    ║
║  □ Información importante (notas)                                  ║
║                                                                    ║
║  Notas: [_________________________________]                        ║
║                                                                    ║
║  [Guardar seguimiento]                                             ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [Cancelar]  [Guardar y cerrar]                                      ║
╚═════════════════════════════════════════════════════════════════════╝

INTERACCIONES:
- Selecciona razón → Muestra canales disponibles
- Selecciona canal → Muestra template o abre app nativa
- Registra resultado automáticamente
```

---

### PANTALLA 5: Asignar Tareas Diarias

**Ruta:** `/tasks/assign`  
**Descripción:** Interfaz para distribuir tareas a agentes rápidamente.

```
╔═════════════════════════════════════════════════════════════════════╗
║               ASIGNAR TAREAS DEL DÍA                                ║
║                                                                     ║
║  Equipo: [Equipo Sur ▼]  | Fecha: 02/07/2026                      ║
║                                                                     ║
║  Filtro: ☑️ Nuevos  ☑️ Sin tareas  ☐ Todos                         ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  TAREAS DISPONIBLES                                                 ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  ✓ Contactar 5 prospectos                                          ║
║    Duración: 60 min | Dificultad: Baja | Prioridad: Normal       ║
║    Asignable a: 8 agentes                                          ║
║                                                                    ║
║  ✓ Presentación simulada (objeciones)                              ║
║    Duración: 45 min | Dificultad: Media | Prioridad: Normal      ║
║    Asignable a: 5 agentes (con paso 3 completado)                ║
║                                                                    ║
║  ✓ Revisar política de comisiones                                  ║
║    Duración: 30 min | Dificultad: Baja | Prioridad: Opcional    ║
║    Asignable a: Todos                                              ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  AGENTES SIN TAREAS (5)                                             ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  ☐ Juan Pérez         (Score: 35 - ⚠️ Requiere supervisión)       ║
║  ☐ María García       (Score: 28 - ⚠️ Requiere supervisión)       ║
║  ☑️ Ana Martínez      (Score: 55 - Asignada a: Contactos)         ║
║  ☑️ Diego Ruiz        (Score: 62 - Asignada a: Simulada)          ║
║  ☑️ Laura Sánchez     (Score: 71 - Asignada a: Revisión)          ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ASIGNACIÓN RÁPIDA                                                  ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  Tarea: [Contactar 5 prospectos ▼]                                ║
║  Asignar a: [Ana, Diego, Laura]                                   ║
║             [➕ Agregar]  [✖ Limpiar]                              ║
║                                                                    ║
║  [Auto-distribuir]  [Personalizar]  [Asignar]                     ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  NOTA (opcional):                                                   ║
║                                                                    ║
║  "Prioridad: clientes nuevos en el sur"                            ║
║                                                                    ║
║  [Asignar y notificar]                                             ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [Cancelar]  [Guardar borrador]  [Asignar]                          ║
╚═════════════════════════════════════════════════════════════════════╝

FLUJO:
- Selecciona tareas disponibles
- Asigna a agentes por checkbox
- Auto-distribuir sugiere automáticamente
- Notificación automática a agentes
```

---

### PANTALLA 6: Lista de Riesgo (Agentes con Riesgo)

**Ruta:** `/alerts/risk`  
**Descripción:** Vista enfocada en agentes en riesgo de abandono.

```
╔═════════════════════════════════════════════════════════════════════╗
║          AGENTES EN RIESGO DE ABANDONO (7)                          ║
║                                                                     ║
║  Criterios: Score < 40 | Sin actividad > 24h                       ║
║  Periodo: Últimos 7 días                                            ║
║                                                                     ║
║  Mostrar: [Todos ▼]  [Equipo: Todos ▼]  [Ordenar por: Urgencia ▼] ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  🔴 CRÍTICO - Contacto inmediato (< 24h sin actividad)             ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  1️⃣  Juan Pérez                                                    ║
║     Score: 35/100 | Inactivo: 28h | Equipo: Sur                   ║
║     Razón principal: No asiste a capacitaciones                    ║
║     [Contactar]  [Plan de acción]  [Nota]                         ║
║     Estado de acción: Última contacto 01/07 11:30                 ║
║                                                                    ║
║  2️⃣  María García                                                  ║
║     Score: 28/100 | Inactivo: 15h | Equipo: Este                  ║
║     Razón principal: Capacitación vencida                          ║
║     [Contactar]  [Plan de acción]  [Nota]                         ║
║     Estado de acción: Sin contacto esta semana                    ║
║                                                                    ║
║  3️⃣  Carlos López                                                  ║
║     Score: 22/100 | Inactivo: 42h | Equipo: Oeste                 ║
║     Razón principal: Sin progreso                                  ║
║     [Contactar]  [Plan de acción]  [Nota]                         ║
║     Estado de acción: Contactado 30/06 - Sin respuesta            ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟠 ALTO - Contacto esta semana                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  4️⃣  Roberto Fernández                                             ║
║     Score: 38/100 | Inactivo: 8h | Equipo: Norte                  ║
║     Razón principal: Baja productividad                            ║
║     [Contactar]  [Plan de acción]  [Nota]                         ║
║                                                                    ║
║  [Ver más...]                                                      ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ACCIONES GRUPALES                                                  ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  ☑️ Seleccionar todos                                              ║
║                                                                    ║
║  [Enviar mensaje grupal]  [Programar capacitación]  [Plan masivo] ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [📊 Estadísticas]  [📋 Plan de Retención]              ║
╚═════════════════════════════════════════════════════════════════════╝

FUNCIONALIDADES:
- Ordena por urgencia/score/inactividad
- Planes de acción pre-configurados
- Contacto grupal
```

---

### PANTALLA 7: Roadmap de Capacitación (Vista de Supervisor)

**Ruta:** `/training/roadmap`  
**Descripción:** Visión de todos los agentes en cada paso del roadmap.

```
╔═════════════════════════════════════════════════════════════════════╗
║           ROADMAP DE CAPACITACIÓN (Todos los agentes)               ║
║                                                                     ║
║           "Camino a la Primera Venta"                               ║
║                                                                     ║
║  Equipo: [Todos ▼]  Mostrar: [Todos ▼]  Fecha: 02/07/2026         ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  PASO 1: Crear Perfil                   ✅ 487 completados         ║
║  ════════════════════════════════════════════════════════════    ║
║  Tiempo promedio: 15 min | Tasa completitud: 100%                 ║
║                                                                    ║
║  PASO 2: Bienvenida                     ✅ 487 completados         ║
║  ════════════════════════════════════════════════════════════    ║
║  Tiempo promedio: 20 min | Tasa completitud: 100%                 ║
║                                                                    ║
║  PASO 3: Conocer Productos              ⏳ 342 en progreso | ✅ 145 │
║  ════════════════════════════════════════════════════════════    ║
║  Tiempo promedio: 45 min | Tasa completitud: 42%                  ║
║  Bloqueados: 15 agentes (quiz sin superar)                        ║
║  Faltantes: 5 agentes (Juan, María, Carlos, Ana, Diego)          ║
║                                                                    ║
║  [Contactar bloqueados]  [Recordar faltantes]  [Ver detalles]     ║
║                                                                    ║
║  PASO 4: Capacitación Inicial          ⏳ 87 en progreso | ✅ 145   │
║  ════════════════════════════════════════════════════════════    ║
║  Tiempo promedio: 90 min | Tasa completitud: 62%                  ║
║  Próxima sesión: 03/07 - 10:00am (12 asientos disponibles)        ║
║  Vencidas: 3 agentes                                               ║
║                                                                    ║
║  [Agendar sesión]  [Recordar vencidas]  [Ver asistencia]          ║
║                                                                    ║
║  PASO 5: Práctica de Ventas             ⏳ 45 en progreso | ✅ 100   │
║  ════════════════════════════════════════════════════════════    ║
║  Tiempo promedio: 60 min | Tasa completitud: 69%                  ║
║  Promedio score práctica: 7.8/10                                  ║
║                                                                    ║
║  PASO 6: Presentación Simulada          ⏳ 12 en progreso | ✅ 88    │
║  ════════════════════════════════════════════════════════════    ║
║  Tiempo promedio: 90 min | Tasa completitud: 88%                  ║
║                                                                    ║
║  PASO 7: Contactar Prospectos           ✅ 45 completados          ║
║  ════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  PASO 8: Primera Venta                  ✅ 32 completados          ║
║  ════════════════════════════════════════════════════════════    ║
║  Tiempo promedio a primera venta: 8.2 días                        ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ESTADÍSTICAS GENERALES                                             ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  Agentes nuevos esta semana: 25                                    ║
║  Agentes en programa: 487                                          ║
║  Tiempo promedio a 1ª venta: 8.2 días                              ║
║  % que llegó a 1ª venta: 32/487 = 6.6%                            ║
║  Tasa de abandono: 3 agentes (0.6%)                                ║
║                                                                    ║
║  [Gráfico semanal]  [Reporte detallado]  [Exportar]               ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [📊 Analytics]  [📧 Enviar reporte]                    ║
╚═════════════════════════════════════════════════════════════════════╝
```

---

### PANTALLA 8: Score de Agentes - Vista de Matriz

**Ruta:** `/analytics/scores`  
**Descripción:** Heatmap/matriz visual de scores de todos los agentes.

```
╔═════════════════════════════════════════════════════════════════════╗
║              MATRIZ DE SCORES - TODOS LOS AGENTES                   ║
║                                                                     ║
║  Periodo: [Este mes ▼]  Equipo: [Todos ▼]  Ordenar: [Score desc ▼]║
║                                                                     ║
║  Filtro: ☑️ Activos  ☑️ Nuevos  ☑️ Inactivos                        ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  🔴 RIESGO (7 agentes - Score 0-40)                                ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  35/100  Juan Pérez        [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   ║
║  28/100  María García      [███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] ║
║  22/100  Carlos López      [██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] ║
║  38/100  Roberto F.        [█████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] ║
║  32/100  Ana Ruiz          [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] ║
║  25/100  Diego Cruz        [███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] ║
║  40/100  Laura Sánchez     [██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░] ║
║                                                                    ║
║  Acción: [Contactar todos]  [Crear plan grupal]  [Analizar causas] ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟠 ATENCIÓN (23 agentes - Score 41-70)                            ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  55/100  Ana Martínez      [████████░░░░░░░░░░░░░░░░░░░░░░░░░░] ║
║  62/100  Diego Ruiz        [█████████░░░░░░░░░░░░░░░░░░░░░░░░░] ║
║  48/100  Patricia López    [███████░░░░░░░░░░░░░░░░░░░░░░░░░░░] ║
║  50/100  Andrés Martín     [███████░░░░░░░░░░░░░░░░░░░░░░░░░░░] ║
║  [Ver más...]                                                      ║
║                                                                    ║
║  Acción: [Dar seguimiento]  [Motivar progreso]  [Plan desarrollo]  ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟢 SALUDABLE (1.970 agentes - Score 71-100)                       ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  TOP 10 - MEJOR DESEMPEÑO:                                          ║
║                                                                    ║
║  98/100  Roberto Sánchez   [█████████████████████████████████████] ║
║  96/100  Patricia López    [██████████████████████████████████░░] ║
║  95/100  Andrés Martín     [████████████████████████████████████░] ║
║  94/100  Carolina Díaz     [███████████████████████████████████░░] ║
║  92/100  Fernando Cruz     [██████████████████████████████████░░░] ║
║  90/100  Mariana López     [█████████████████████████████████░░░░] ║
║  89/100  Ricardo Gómez     [████████████████████████████████░░░░░] ║
║  88/100  Silvia Martínez   [███████████████████████████████░░░░░░] ║
║  87/100  Jorge García      [██████████████████████████████░░░░░░░] ║
║  86/100  Valentina Soto    [█████████████████████████████░░░░░░░░] ║
║                                                                    ║
║  Acción: [Reconocer]  [Dar liderazgo]  [Usar como mentores]        ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [📊 Gráficos]  [📋 Reporte completo]                   ║
╚═════════════════════════════════════════════════════════════════════╝

INTERACTIVIDAD:
- Click en agente → Va a su perfil
- Hover sobre score → Muestra desglose (Actividad/Asistencia/etc)
- Colores: 🔴 Rojo/🟠 Naranja/🟢 Verde
```

---

### PANTALLA 9: Notificaciones y Historial

**Ruta:** `/notifications`  
**Descripción:** Central de alertas y historial de acciones.

```
╔═════════════════════════════════════════════════════════════════════╗
║                    NOTIFICACIONES Y ALERTAS                         ║
║                                                                     ║
║  Filtro: [Todas ▼]  [Pendientes ▼]  [Hoy ▼]                        ║
║                                                                     ║
║  ☐ Marcar todo como leído  [Limpiar historial]                     ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  🔴 URGENTES (3)                                                    ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  09:15  Juan Pérez - Sin actividad 28h                            ║
║         ☐ Leer | [Contactar] | [Marcar OK]                        ║
║                                                                    ║
║  09:10  Reunión Líderes - 2 asuntos sin asignar                   ║
║         ☐ Leer | [Ver detalles] | [Asignar ahora]                ║
║                                                                    ║
║  09:05  Cliente XYZ - Última actividad hace 15 días               ║
║         ☐ Leer | [Reasignar] | [Contactar]                       ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟠 HOY (8)                                                         ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  08:00  ✓ Recordatorio: Capacitación Equipo Sur a las 15:00       ║
║         ☑ Leído | [Ver detalles]                                  ║
║                                                                    ║
║  07:30  8 agentes sin tareas asignadas                            ║
║         ☑ Leído | [Asignar tareas]                                ║
║                                                                    ║
║  [Ver más alertas...]                                              ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  HISTORIAL - ACCIONES REALIZADAS                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  02/07 - 11:30  Cecilia contactó a Juan Pérez por WhatsApp       ║
║                 Resultado: Respondió positivamente                 ║
║                 Nota: "Necesita recordatorio de capacitación"     ║
║                 [Ver detalles]                                    ║
║                                                                    ║
║  02/07 - 11:00  Asignó "Contactar 5 prospectos" a Ana, Diego, L.║
║                 Estado: Activas                                   ║
║                 [Ver detalles]  [Editar]                          ║
║                                                                    ║
║  02/07 - 10:45  Envió recordatorio a Equipo Sur sobre capacit.   ║
║                 Enviados a: 8 agentes                             ║
║                 [Ver respuestas]                                  ║
║                                                                    ║
║  01/07 - 17:00  Revisó agentes en riesgo                          ║
║                 Clasificados: 7 agentes                           ║
║                 [Ver análisis]                                    ║
║                                                                    ║
║  [Ver historial completo]                                          ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [📊 Estadísticas]  [⚙️ Preferencias]                    ║
╚═════════════════════════════════════════════════════════════════════╝

FUNCIONAMIENTO:
- Notifications feed estilo redes sociales
- Marcar como leída/OK
- Historial de acciones ejecutadas
- Filtros por tipo/prioridad
```

---

### PANTALLA 10: Crear/Editar Agente

**Ruta:** `/agents/new` o `/agents/:id/edit`  
**Descripción:** Formulario para alta de nuevos agentes.

```
╔═════════════════════════════════════════════════════════════════════╗
║                    AGREGAR NUEVO AGENTE                             ║
║                                                                     ║
║  Paso 1/2 - Información Básica                                     ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  Nombre Completo: [________________________]                        ║
║  Email: [________________________]                                  ║
║  Teléfono: [________________________]                               ║
║  WhatsApp: [________________________]  ☑️ Mismo que teléfono       ║
║                                                                     ║
║  Equipo: [Seleccionar ▼]                                            ║
║          □ Equipo Sur                                               ║
║          □ Equipo Este                                              ║
║          □ Equipo Oeste                                             ║
║          □ Equipo Norte                                             ║
║                                                                     ║
║  Líder Directo: [Seleccionar ▼]                                     ║
║                 (Se filtra por equipo seleccionado)                ║
║                                                                     ║
║  Fecha de Ingreso: [02/07/2026]                                    ║
║                                                                     ║
║  Nivel Técnico: [Seleccionar ▼]                                     ║
║                 □ Muy bajo                                          ║
║                 □ Bajo                                              ║
║                 □ Medio                                             ║
║                 □ Alto                                              ║
║                                                                     ║
║  Experiencia Previa: [Seleccionar ▼]                               ║
║                      □ Ninguna                                      ║
║                      □ < 1 año                                      ║
║                      □ 1-3 años                                     ║
║                      □ > 3 años                                     ║
║                                                                     ║
║  Notas Iniciales: [__________________________________]            ║
║                   "Referido por: Cecilia"                          ║
║                                                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║  CONFIGURACIÓN INICIAL                                              ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  ☑️ Enviar bienvenida automática                                   ║
║  ☑️ Asignar roadmap estándar                                       ║
║  ☑️ Enviar credenciales por WhatsApp                              ║
║  ☐ Asignar mentor (específico)                                     ║
║     Mentor: [Seleccionar ▼]                                        ║
║                                                                    ║
║  [Anterior]  [Siguiente]  [Cancelar]                              ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ Paso: ●─────○  (33%)                                               ║
╚═════════════════════════════════════════════════════════════════════╝

FLUJO:
- Paso 1: Información básica
- Paso 2: Configuración inicial
- Confirmación: Enviará bienvenida automática
```

---

### PANTALLA 11: Resumen Semanal de Cecilia

**Ruta:** `/dashboard/weekly`  
**Descripción:** Reporte de cierre semanal.

```
╔═════════════════════════════════════════════════════════════════════╗
║              RESUMEN SEMANAL - 25/06 al 01/07                       ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  📊 MÉTRICAS CLAVE                                                  ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  Agentes activos: 1.993 ✅                                         ║
║  Agentes nuevos: 25                                                ║
║  Agentes en riesgo: 7 (↓ 2 respecto a semana anterior)            ║
║                                                                    ║
║  Agentes contactados: 156/180 (87%)                                ║
║  Agentes con tareas asignadas: 285/487 (59%)                       ║
║  Capacitaciones realizadas: 12/12 (100%)                           ║
║                                                                    ║
║  Nuevas ventas (1ª): 8 agentes                                     ║
║  Tiempo promedio a 1ª venta: 8.2 días ↓ 0.5d                       ║
║  Tasa de abandono: 0.6% (3 agentes) ↓ 0.3%                         ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  📈 GRÁFICOS                                                        ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  Tendencia de contactos (gráfica lineal)                           ║
║  [Gráfica]  Mon Tue Wed Thu Fri Sat Sun                            ║
║             25  28  32  41  50  60  20                             ║
║                                                                    ║
║  Distribución de scores (gráfica de torta)                         ║
║  🔴 Riesgo: 7 (0.4%)  🟠 Atención: 23 (1.2%)  🟢 Saludable: 1.970  ║
║  [Gráfica pastel]                                                  ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🏆 HITOS ALCANZADOS                                                ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  ✓ Equipo Sur: +15% productividad                                 ║
║  ✓ 5 agentes nuevos completaron roadmap                           ║
║  ✓ 8 primeras ventas completadas                                  ║
║  ✓ 100% asistencia a capacitaciones programadas                   ║
║  ✓ Reducción de 2 agentes en riesgo vs semana anterior            ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ⚠️ PENDIENTES PARA ESTA SEMANA                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  • Contacto a 3 agentes críticos (Carlos, María, Roberto)         ║
║  • Seguimiento a 5 agentes en progreso (Paso 4)                   ║
║  • Reconocimiento a Equipo Norte (bonus, insignias)               ║
║  • Análisis: ¿Por qué bajó abandono? Replicar                    ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ACCIONES RECOMENDADAS PARA ESTA SEMANA                             ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  [Enviar boletín grupal] [Agendar capacitación] [Crear plan]      ║
║  [Exportar reporte]     [Compartir con equipo]  [Más acciones]    ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [📊 Ver detalles]  [📧 Enviar por email]  [⬇ Descargar]║
╚═════════════════════════════════════════════════════════════════════╝
```

---

### PANTALLA 12: Configuración y Preferencias

**Ruta:** `/settings`  
**Descripción:** Configuración de notificaciones, integraciones, preferencias.

```
╔═════════════════════════════════════════════════════════════════════╗
║                   CONFIGURACIÓN Y PREFERENCIAS                      ║
║                                                                     ║
║  Buscar: [___________]                                              ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  👤 PERFIL                                                          ║
║  ═════════════════════════════════════════════════════════════    ║
║  Nombre: Cecilia Martínez                                          ║
║  Email: cecilia@agencia.com                                        ║
║  Teléfono: +54 9 11 1234-5678                                      ║
║  Rol: Dueña / Administradora                                       ║
║  [Editar perfil]  [Cambiar contraseña]                             ║
║                                                                    ║
║  🔔 NOTIFICACIONES                                                  ║
║  ═════════════════════════════════════════════════════════════    ║
║  ☑️ Notificaciones push habilitadas                                 ║
║     Horario: 09:00 - 18:00                                         ║
║     ☑️ Alertas urgentes 24/7                                       ║
║  ☑️ WhatsApp habilitado (integración)                              ║
║  ☑️ Email resumen diario                                           ║
║     Hora: 18:00                                                    ║
║  ☐ Email resumen semanal                                           ║
║  ☑️ SMS para urgencias críticas                                    ║
║                                                                    ║
║  🎯 PREFERENCIAS OPERATIVAS                                         ║
║  ═════════════════════════════════════════════════════════════    ║
║  Idioma: [Español ▼]                                               ║
║  Zona horaria: [America/Buenos_Aires ▼]                            ║
║  Formato de fecha: [DD/MM/YYYY ▼]                                  ║
║  Tema: [Claro ▼]                                                   ║
║                                                                    ║
║  Mostrar próximos recordatorios: [Próximas 2h ▼]                   ║
║  Agrupar alertas similares: ☑️                                      ║
║  Auto-distribuir tareas: ☑️                                         ║
║     Criterio: [Score + Disponibilidad ▼]                          ║
║                                                                    ║
║  🔗 INTEGRACIONES                                                   ║
║  ═════════════════════════════════════════════════════════════    ║
║  ☑️ Zoom conectado (cecilia@agencia.zoom.us)                       ║
║     Datos: Asistencia automática                                   ║
║     [Desconectar]  [Reconfigurar]                                  ║
║                                                                    ║
║  ☑️ WhatsApp Business conectado                                    ║
║     Cuenta: +54 9 11 0000-0000                                     ║
║     [Desconectar]  [Reconfigurar]                                  ║
║                                                                    ║
║  ☐ Salesforce (no conectado)                                       ║
║     [Conectar]                                                     ║
║                                                                    ║
║  ☐ WFG / Sistema de seguros (no conectado)                        ║
║     [Conectar]  [Contactar soporte]                                ║
║                                                                    ║
║  🔐 PRIVACIDAD Y SEGURIDAD                                          ║
║  ═════════════════════════════════════════════════════════════    ║
║  ☑️ Autenticación de dos factores (2FA)                            ║
║     Método: SMS                                                    ║
║     [Cambiar método]  [Reconfigurar]                               ║
║                                                                    ║
║  ☐ Compartir dashboards con equipo                                 ║
║     Usuarios: [Agregar]                                            ║
║                                                                    ║
║  Descargar mis datos: [Descargar]                                  ║
║                                                                    ║
║  [Guardar cambios]  [Cancelar]                                     ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [ℹ️ Ayuda]  [Cerrar sesión]                             ║
╚═════════════════════════════════════════════════════════════════════╝
```

---

## PANTALLAS AGENTES (EJECUTORES)

---

### PANTALLA 13: Dashboard Principal del Agente

**Ruta:** `/agent/dashboard`  
**Descripción:** Pantalla de entrada para nuevo agente.

```
╔═════════════════════════════════════════════════════════════════════╗
║                      MENTORCOMERCIAL                                ║
║                  👋 Hola María                                      ║
║           Lunes 2 de Julio - 09:00 AM                              ║
║                                                                     ║
║  Score: 82/100 🟢 SALUDABLE | Progreso: 35%                       ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  🔴 URGENTE - HOY                                                   ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  📍 Terminar Práctica de Ventas                                    ║
║     ⏰ Vence: HOY 5:00 PM (8 horas restantes)                      ║
║     📊 Progreso: 80% completado ████████░░                         ║
║     [Continuar]  [Necesito ayuda]                                  ║
║                                                                    ║
║  📍 Asistir a Capacitación Inicial                                 ║
║     ⏰ Comienza: HOY 10:00 AM (1 hora)                              ║
║     📍 Zoom: [Entrar a sala Zoom]                                  ║
║     [Recordar]  [Reprogramar]                                      ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟠 HOY - TU AGENDA                                                ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  ⏰ 10:00 AM - Capacitación Inicial                                 ║
║     Duración: 90 minutos | [Ver detalles]                          ║
║                                                                    ║
║  ⏰ 12:00 PM - Contactar 5 Prospectos                               ║
║     Tareas: Ver lista de contactos                                 ║
║     [Acceder a lista]  [Reportar avance]                           ║
║                                                                    ║
║  ⏰ 3:00 PM - Descanso/Tiempo libre                                 ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟡 ESTA SEMANA                                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  📌 Completar Paso 4 del Roadmap                                   ║
║     "Presentación de Venta"                                        ║
║     Tiempo: Próximos 3 días                                        ║
║     [Ver detalles]  [Empezar]                                      ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ✨ ¡LO ESTÁS HACIENDO BIEN!                                        ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  🏅 Insignia Nueva: "Asistencia Perfecta" esta semana             ║
║  💬 Mensaje de Cecilia: "María, ¡vamos muy bien! Sigue así" 👍    ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  PROGRESO HOY: 2/5 tareas completadas ✅                           ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [🎯 Mi Roadmap]  [📋 Mis Tareas]  [❓ Ayuda]  [⚙️ Mi Perfil]       ║
╚═════════════════════════════════════════════════════════════════════╝

FLUJO:
- Urgencias claras con botones de acción
- Agenda del día estructurada
- Reconocimiento visible
- Acceso a todo en 2-3 taps
```

---

### PANTALLA 14: Roadmap de Onboarding del Agente

**Ruta:** `/agent/roadmap`  
**Descripción:** Tu camino a la primera venta.

```
╔═════════════════════════════════════════════════════════════════════╗
║         🎯 TU CAMINO A LA PRIMERA VENTA                             ║
║                                                                     ║
║  Progreso Total: 35% - ¡Vas muy bien! ✅                           ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  ✅ PASO 1: Crear Perfil                     Completado: 30/06    ║
║  ║  Insignia: "Iniciado" 🏅                                        ║
║  ║  Tiempo: 15 minutos                                             ║
║  ║  [Ver detalles]                                                 ║
║  ║                                                                 ║
║  └─────────────────────────────────────────────────────────────   ║
║                                                                    ║
║  ✅ PASO 2: Bienvenida al Sistema            Completado: 30/06    ║
║  ║  Insignia: "Conectado" 🏅                                       ║
║  ║  Tiempo: 20 minutos                                             ║
║  ║  [Ver detalles]                                                 ║
║  ║                                                                 ║
║  └─────────────────────────────────────────────────────────────   ║
║                                                                    ║
║  ✅ PASO 3: Conocer los Productos           Completado: 01/07    ║
║  ║  Insignia: "Experto" 🏅                                         ║
║  ║  Tiempo: 45 minutos                                             ║
║  ║  Quiz: 9/10 ✅                                                  ║
║  ║  Material: AIG, Seguros de Vida, Retiro                        ║
║  ║  [Ver detalles]                                                 ║
║  ║                                                                 ║
║  └─────────────────────────────────────────────────────────────   ║
║                                                                    ║
║  🔴 PASO 4: Capacitación Inicial (URGENTE)  VENCE: HOY 5pm        ║
║  ║  🟢 Estado: Confirmada para hoy 10am                            ║
║  ║  Duración: 90 minutos                                           ║
║  ║  Con: Cecilia Martínez                                          ║
║  ║  Zoom: [Entrar a sesión] 📹                                     ║
║  ║                                                                 ║
║  ║  📚 Material previo:                                             ║
║  ║     • Slides: Proceso de venta                                  ║
║  ║     • Video: Objeciones comunes                                 ║
║  ║     • Documento: Seguimiento post-venta                         ║
║  ║     [Ver material]                                              ║
║  ║                                                                 ║
║  ║  ⚠️ Si faltas, la sesión se reprograma para el 04/07            ║
║  ║  [Confirmar asistencia]  [Reprogramar]  [Necesito ayuda]       ║
║  ║                                                                 ║
║  └─────────────────────────────────────────────────────────────   ║
║                                                                    ║
║  ⬜ PASO 5: Práctica de Ventas              Comienza: 03/07       ║
║  ║  Duración: 60 minutos                                           ║
║  ║  Con: Coach del equipo                                          ║
║  ║  Qué harás: Simular 3 llamadas de venta                        ║
║  ║                                                                 ║
║  ║  📝 Requisitos previos:                                         ║
║  ║     ✅ Paso 1-3 completados                                     ║
║  ║     ✅ Asistencia a Paso 4                                      ║
║  ║     ⬜ Paso 5 (próximo)                                          ║
║  ║                                                                 ║
║  ║  [Prepararse]  [Ver guía]  [Contactar coach]                   ║
║  ║                                                                 ║
║  └─────────────────────────────────────────────────────────────   ║
║                                                                    ║
║  ⬜ PASO 6: Presentación Simulada            Comienza: 05/07      ║
║  ║  Duración: 90 minutos                                           ║
║  ║  [Detalles]                                                     ║
║  ║                                                                 ║
║  └─────────────────────────────────────────────────────────────   ║
║                                                                    ║
║  ⬜ PASO 7: Contactar Primeros Prospectos    Comienza: 08/07      ║
║  ║  Duración: Abierta                                              ║
║  ║  [Detalles]                                                     ║
║  ║                                                                 ║
║  └─────────────────────────────────────────────────────────────   ║
║                                                                    ║
║  ⬜ PASO 8: Tu Primera Venta 🎉             Objetivo: 10/07       ║
║  ║  "¡Llega a este punto y habrás alcanzado tu meta inicial!"     ║
║  ║  [Detalles]                                                     ║
║  ║                                                                 ║
║  └─────────────────────────────────────────────────────────────   ║
║                                                                    ║
║  ESTADÍSTICAS PERSONALES:                                          ║
║  • Tiempo en programa: 12 días                                     ║
║  • Tiempo promedio a paso: 1.5 días                                ║
║  • Proyección: Primera venta en ~8 días                            ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [❓ Preguntas frecuentes]  [💬 Chat de soporte]        ║
╚═════════════════════════════════════════════════════════════════════╝

INTERACTIVIDAD:
- Click en paso completado → Ver certificado/detalles
- Click en paso actual → Material + acción
- Click en paso futuro → Requisitos previos
```

---

### PANTALLA 15: Detalle de Tarea/Paso Individual

**Ruta:** `/agent/roadmap/:stepId`  
**Descripción:** Vista detallada de un paso específico del roadmap.

```
╔═════════════════════════════════════════════════════════════════════╗
║               PASO 4: CAPACITACIÓN INICIAL                          ║
║                                                                     ║
║  Estado: 🔴 URGENTE - HOY 5:00 PM | Confirmado para 10:00 AM      ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  ¿QUÉ ES ESTE PASO?                                                ║
║  ═════════════════════════════════════════════════════════════    ║
║  Sesión en vivo donde aprenderás el proceso de venta de nuestro   ║
║  sistema. Conocerás las herramientas, las objeciones comunes, y   ║
║  cómo hacer seguimiento efectivo después de una presentación.     ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  INFORMACIÓN IMPORTANTE                                             ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  📅 Fecha y Hora: Hoy - 10:00 AM (Buenos Aires)                   ║
║  ⏱️ Duración: 90 minutos                                           ║
║  👤 Facilitador: Cecilia Martínez (Dueña)                         ║
║  📹 Plataforma: Zoom (link enviado a tu email)                    ║
║  📍 Enlace Zoom: [Entrar a sala]                                  ║
║                                                                    ║
║  ⚠️ IMPORTANTE: Se registrará asistencia automáticamente.          ║
║     Si no asistes, la sesión se reprograma.                       ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  MATERIAL PREVIO (Lee antes de la sesión)                           ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  📄 DOCUMENTO: Proceso de Venta (3 páginas)                        ║
║     "Entiende los 5 pasos del proceso"                             ║
║     [Ver documento]  [⬇ Descargar]                                 ║
║                                                                    ║
║  🎥 VIDEO: Objeciones Comunes y Cómo Responder                     ║
║     Duración: 8 minutos                                            ║
║     [Ver video]                                                    ║
║                                                                    ║
║  ✓ CHECKLIST: Qué llevar a la sesión                               ║
║     ☑ Notebook/Laptop encendido                                    ║
║     ☑ Micrófono y cámara funcionando                              ║
║     ☑ Material de Paso 3 a mano                                    ║
║     ☑ Café ☕                                                      ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  TEMAS QUE CUBRIREMOS                                               ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  1. Presentación de productos (20 min)                             ║
║  2. Proceso de venta paso a paso (30 min)                          ║
║  3. Manejo de objeciones (20 min)                                  ║
║  4. Preguntas y respuestas (20 min)                                ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  DESPUÉS DE ESTA SESIÓN                                             ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  ✓ Recibirás grabación (24h después)                               ║
║  ✓ Acceso a material complementario                                ║
║  ✓ Próximo paso: Práctica de Ventas (04/07)                       ║
║  ✓ Puedes revisar notas y slides                                   ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ACCIONES                                                           ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  [📹 Entrar a Zoom YA]  [Confirmar asistencia]  [Necesito ayuda] ║
║  [⬇ Descargar material]  [Preguntas frecuentes]                   ║
║                                                                    ║
║  Mensaje de Cecilia:                                               ║
║  "María, ¡te espero en una hora! No te preocupes, esto es fácil  ║
║   y divertido. Estamos acá para aprender juntas. ¡Vamos!"        ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [💬 Preguntas]  [❓ Chat de soporte]                    ║
╚═════════════════════════════════════════════════════════════════════╝
```

---

### PANTALLA 16: Mis Tareas del Día

**Ruta:** `/agent/tasks`  
**Descripción:** Lista de tareas asignadas para hoy.

```
╔═════════════════════════════════════════════════════════════════════╗
║                     MIS TAREAS DE HOY                               ║
║                    Lunes 2 de Julio                                 ║
║                                                                     ║
║  Progreso: 2/5 completadas ✅                                       ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  🔴 ANTES DE LAS 5:00 PM                                            ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  1️⃣  ✅ Terminar Práctica de Ventas                                ║
║      Estado: EN PROGRESO (80% completada)                          ║
║      Tiempo asignado: 60 minutos | Tiempo usado: 45 min           ║
║      Progreso: ████████░░ (80%)                                    ║
║      Tiempo restante: 6 horas (Vence 17:00)                       ║
║      [Continuar]  [Necesito ayuda]  [Marcar completa]             ║
║                                                                    ║
║  2️⃣  🔴 Asistir a Capacitación Inicial                             ║
║      Estado: PRÓXIMAMENTE (en 1 hora)                              ║
║      Tiempo: 10:00 AM - 11:30 AM (90 min)                         ║
║      Facilitador: Cecilia Martínez                                 ║
║      [Entrar a Zoom]  [Confirmar]  [Reprogramar]                  ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟠 DURANTE EL DÍA                                                  ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  3️⃣  ⬜ Contactar 5 Prospectos                                      ║
║      Estado: NO INICIADA                                           ║
║      Horario: 12:00 PM - 1:00 PM                                  ║
║      Contactos a hacer:                                            ║
║      • Roberto Sánchez - +54 9 11 1111-1111                       ║
║      • Patricia López - +54 9 11 2222-2222                        ║
║      • Andrés Martín - +54 9 11 3333-3333                         ║
║      • Carolina Díaz - +54 9 11 4444-4444                         ║
║      • Fernando Cruz - +54 9 11 5555-5555                         ║
║      [Ver lista completa]  [Hacer llamadas]  [Reportar avance]    ║
║                                                                    ║
║  4️⃣  ⬜ Registrar Resultados                                        ║
║      Estado: NO INICIADA                                           ║
║      Información a registrar: Contactos exitosos, objeciones       ║
║      [Formulario rápido]                                           ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🟡 FINAL DEL DÍA (Automático)                                      ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  5️⃣  ⬜ Enviar Reporte de Actividad                                 ║
║      Estado: AUTOMÁTICO (se envía a las 17:00)                    ║
║      Información: Tareas completadas, contactos, tiempo            ║
║      [Ver plantilla]  [Enviar ahora]                               ║
║                                                                    ║
║  ═════════════════════════════════════════════════════════════    ║
║  RESUMEN DEL DÍA                                                    ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  Tareas completadas: 2/5 (40%) ⏱️ En tiempo ✅                     ║
║  Tiempo disponible: 8 horas                                        ║
║  Tiempo usado: 45 minutos                                          ║
║  Tiempo restante: 7 h 15 min                                       ║
║                                                                    ║
║  Recomendación: "Acabas de terminar la práctica de ventas.        ║
║                  ¡Ahora tienes que asistir a capacitación!"       ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [📊 Estadísticas]  [❓ Preguntas]                       ║
╚═════════════════════════════════════════════════════════════════════╝

INTERACTIVIDAD:
- Click en tarea → Ve detalles
- Progreso visual en cada tarea
- Recordatorios automáticos
```

---

### PANTALLA 17: Insignias y Reconocimientos

**Ruta:** `/agent/badges`  
**Descripción:** Sistema de gamificación de agente.

```
╔═════════════════════════════════════════════════════════════════════╗
║                   MIS LOGROS Y RECONOCIMIENTOS                      ║
║                                                                     ║
║  Puntuación total: 420 puntos 🏆                                    ║
║  Ranking: #47 del equipo Sur (78 agentes)                          ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  🏅 INSIGNIAS OBTENIDAS (7)                                         ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  🌟 Iniciado (30 Jun)                                              ║
║     "Creaste tu perfil en el sistema"                              ║
║     Puntos: 10                                                     ║
║                                                                    ║
║  🌟 Conectado (30 Jun)                                             ║
║     "Visitaste la bienvenida completa"                             ║
║     Puntos: 10                                                     ║
║                                                                    ║
║  🌟 Experto en Productos (01 Jul)                                  ║
║     "Completaste el quiz de productos con 9/10"                    ║
║     Puntos: 25                                                     ║
║                                                                    ║
║  🌟 Asistencia Perfecta (02 Jul)                                   ║
║     "Asististe a todas las capacitaciones esta semana"            ║
║     Puntos: 50                                                     ║
║                                                                    ║
║  🌟 Trabajador Incansable (02 Jul)                                 ║
║     "Completaste 5 tareas en 1 día"                                ║
║     Puntos: 75                                                     ║
║                                                                    ║
║  🌟 En el Camino (02 Jul)                                          ║
║     "Completaste 35% del roadmap a Primera Venta"                 ║
║     Puntos: 100                                                    ║
║                                                                    ║
║  🌟 Comunicativo (02 Jul)                                          ║
║     "Interactuaste con el sistema 50+ veces"                      ║
║     Puntos: 120                                                    ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🎯 PRÓXIMAS INSIGNIAS PARA GANAR                                   ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  ⬜ Capacitada (Casi lista!)                                        ║
║     "Asistir a capacitación inicial"                               ║
║     Progreso: 0/1 ⏳ HOY                                            ║
║     Puntos: +50                                                    ║
║                                                                    ║
║  ⬜ Practicante                                                     ║
║     "Completar práctica de ventas"                                 ║
║     Progreso: Próximo paso                                         ║
║     Puntos: +75                                                    ║
║                                                                    ║
║  ⬜ Primera Venta 🎉                                                 ║
║     "Realizar tu primera venta"                                    ║
║     Progreso: Objetivo final                                       ║
║     Puntos: +250                                                   ║
║                                                                    ║
║  ⬜ Top 10 (Meta)                                                   ║
║     "Llegar al top 10 del equipo"                                  ║
║     Progreso: #47 → Meta: Top 10                                   ║
║     Puntos: +300                                                   ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  RANKING DEL EQUIPO SUR (Top 10)                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  🥇 1. Roberto Sánchez        540 puntos                            ║
║     🏅🏅🏅 8 insignias                                              ║
║                                                                    ║
║  🥈 2. Patricia López         520 puntos                            ║
║     🏅🏅🏅 8 insignias                                              ║
║                                                                    ║
║  🥉 3. Andrés Martín          510 puntos                            ║
║     🏅🏅 7 insignias                                                ║
║                                                                    ║
║  4. Carolina Díaz            480 puntos                            ║
║  5. Fernando Cruz            470 puntos                            ║
║  6. Mariana López            450 puntos                            ║
║  7. Ricardo Gómez            440 puntos                            ║
║  8. Silvia Martínez          430 puntos                            ║
║  9. Jorge García             420 puntos 👈 TÚ ESTÁS AQUÍ             ║
║  10. Valentina Soto          410 puntos                            ║
║                                                                    ║
║  [Ver ranking completo]  [Desafío semanal]                         ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [📊 Mi estadística]  [👥 Comparar con otros]           ║
╚═════════════════════════════════════════════════════════════════════╝

GAMIFICACIÓN:
- Insignias desbloqueables
- Ranking dinámico
- Puntos por acciones
- Competencia saludable
```

---

### PANTALLA 18: Chat/Soporte del Agente

**Ruta:** `/agent/support`  
**Descripción:** Comunic ación con mentores y soporte.

```
╔═════════════════════════════════════════════════════════════════════╗
║                    SOPORTE Y MENTORES                               ║
║                                                                     ║
║  Estado: Conectado 🟢                                               ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  👤 MI MENTOR: Cecilia Martínez                                    ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  Estado: En línea 🟢 (Última actividad: hace 5 min)                ║
║  Tiempo de respuesta promedio: 15 minutos                          ║
║                                                                    ║
║  Mis preguntas esta semana: 3                                      ║
║  Resueltas: 3 ✅                                                    ║
║  Tiempo promedio: 20 minutos                                       ║
║                                                                    ║
║  [Contactar]  [Ver mensajes anteriores]  [Agendar llamada]        ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  MENSAJES RECIENTES                                                 ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  HILO: "Dudas sobre presentación de productos"                     ║
║                                                                    ║
║  María - 02/07 09:30                                               ║
║  "Hola Cecilia, ¿cómo presento los seguros de vida?"              ║
║                                                                    ║
║  Cecilia - 02/07 09:45                                             ║
║  "Hola María! Perfecto. Mira, lo más importante es empezar        ║
║   por entender las necesidades del cliente. Así después les      ║
║   muestras cómo nuestros productos solucionan eso. Te mando       ║
║   un video de 8 min que te ayuda. ¡Mucho éxito!"                  ║
║  📎 Video: "Presentación de vida.mp4" (8:32)                       ║
║  [Ver video]                                                       ║
║                                                                    ║
║  María - 02/07 10:00                                               ║
║  "¡Excelente! Muchas gracias"                                      ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ESCRIBIR NUEVO MENSAJE                                             ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  "¿Tienes un minuto? Quería preguntarte sobre..."                ║
║                                                                    ║
║  [📎 Adjuntar archivo]  [Enviar mensaje]                           ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  🆘 SOPORTE TÉCNICO - PREGUNTAS FRECUENTES                         ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  "¿Cómo recupero mi contraseña?"                                   ║
║  "¿Cómo reporto problemas?"                                        ║
║  "¿Quién puedo contactar si tengo dudas?"                          ║
║  "¿Cómo accedo a los materiales de estudio?"                       ║
║  "¿Qué pasa si falto a una capacitación?"                          ║
║  "¿Cómo se cuenta el tiempo de estudio?"                           ║
║                                                                    ║
║  [Ver todas las preguntas frecuentes]                              ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [📞 Llamar a Cecilia]  [📧 Enviar correo]              ║
╚═════════════════════════════════════════════════════════════════════╝
```

---

### PANTALLA 19: Mi Progreso (Estadísticas Personales)

**Ruta:** `/agent/progress`  
**Descripción:** Dashboard de auto-monitoreo.

```
╔═════════════════════════════════════════════════════════════════════╗
║                      MI PROGRESO PERSONAL                           ║
║                                                                     ║
║  María García | En el Programa: 12 días | Score: 82/100            ║
║                                                                     ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  📊 MÉTRICA PRINCIPAL: CAMINO A PRIMERA VENTA                       ║
║  ═════════════════════════════════════════════════════════════    ║
║                                                                    ║
║  Progreso: ███████░░░░░░░ 35/100 (35%)                            ║
║  Pasos completados: 3/8                                            ║
║  Tiempo en programa: 12 días                                       ║
║  Proyección: Primera venta en ~8 días                              ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  DESGLOSE POR MÉTRICA                                               ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  Actividad:        ████████░░ 82% (Muy activa ✅)                  ║
║  Asistencia:       ██████░░░░ 80% (5/5 sesiones)                  ║
║  Tareas Completadas: ████████░░ 80% (16/20)                        ║
║  Tiempo de Estudio: ███████░░░ 70% (44 horas)                      ║
║                                                                    ║
║  Score Promedio: 82/100 🟢 SALUDABLE                               ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  ACTIVIDAD SEMANAL                                                  ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  Lun  Mar  Mié  Jue  Vie  Sab  Dom                                 ║
║  ███  ███  ███  ███  ███   ██   █   (Accesos diarios)            ║
║                                                                    ║
║  Promedio diario: 2.5 horas                                        ║
║  Máximo día: Viernes (4.5 horas)                                   ║
║  Tendencia: ↑ En aumento                                           ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  TAREAS COMPLETADAS ESTA SEMANA (15)                               ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  ✅ Lun: Paso 3 Quiz (9/10)                                        ║
║  ✅ Mar: Práctica de ventas (80%)                                  ║
║  ✅ Mié: Contactar prospectos (5)                                  ║
║  ✅ Jue: Ver materiales (3 videos)                                 ║
║  ✅ Vie: Revisar políticas (1 hora)                                ║
║  [Ver más...]                                                      ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  COMPARACIÓN CON PROMEDIO DEL EQUIPO                                ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  Mi Score:           82/100 👈 TÚ                                  ║
║  Promedio equipo:    65/100 📊                                     ║
║  Agentes arriba mío: 32 (41%)                                      ║
║  Agentes abajo tuyo: 46 (59%)                                      ║
║                                                                    ║
║  Conclusion: Vas mejor que el promedio ✅                          ║
║                                                                    ║
║  ─────────────────────────────────────────────────────────────    ║
║  PRÓXIMOS HITOS                                                     ║
║  ─────────────────────────────────────────────────────────────    ║
║                                                                    ║
║  🎯 Próximo: Asistencia a Capacitación Inicial                    ║
║     Fecha: HOY 10:00 AM                                            ║
║     Impacto: +100 puntos                                           ║
║                                                                    ║
║  🎯 Después: Práctica de Ventas                                    ║
║     Fecha: 03/07                                                   ║
║     Impacto: +75 puntos                                            ║
║                                                                    ║
║  🎯 Meta: Primera Venta                                             ║
║     Proyección: ~10/07                                             ║
║     Impacto: +250 puntos + Bonificación                            ║
║                                                                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ [◀ Volver]  [📊 Comparativa]  [💪 Consejos para mejorar]           ║
╚═════════════════════════════════════════════════════════════════════╝
```

---

### PANTALLA 20: Recordatorio Visual de Vencimiento (Modal/Push)

**Ruta:** N/A (Pop-up/Modal)  
**Descripción:** Notificación urgente de tarea próxima a vencer.

```
╔═════════════════════════════════════════════════════════════════════╗
║                                                                     ║
║                  ⚠️  RECORDATORIO URGENTE                           ║
║                                                                     ║
║              Tu práctica de ventas vence en 1 HORA                 ║
║                          (4:00 PM)                                  ║
║                                                                     ║
║  Progreso actual:  ████████░░ 80%                                   ║
║  Tiempo restante: 60 minutos                                        ║
║  Tiempo usado: 45 minutos                                           ║
║                                                                     ║
║  ¿Puedes terminarla? ¡Vas muy bien!                                ║
║                                                                     ║
║                                                                     ║
║              [❌ Necesito ayuda]  [✅ Voy a terminarla]             ║
║                                                                     ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝

COMPORTAMIENTO:
- Aparece 1 hora antes del vencimiento
- Sonido + vibración
- No se puede descartar (solo reconocer)
- Si hace clic en "ayuda" → Abre chat con mentor
```

---

## Resumen de Navegación

### Para CECILIA (Supervisor):
```
Dashboard Principal → Lista Agentes → Perfil Agente → Contacto
                   → Alertas/Riesgos
                   → Roadmap Capacitación
                   → Asignar Tareas
                   → Scores/Analytics
                   → Notificaciones
                   → Configuración
```

### Para AGENTES:
```
Dashboard Personal → Mi Roadmap → Detalle Paso → Mis Tareas
                  → Insignias
                  → Chat Soporte
                  → Mi Progreso
                  → Notificaciones
```

---

## Principios de Diseño Aplicados en Todas las Pantallas

✅ **Mobile First** - Optimizado para celular
✅ **Urgencia Visual** - 🔴🟠🟡🟢 clara
✅ **Una acción principal por pantalla** - No abrumar
✅ **Back button siempre visible** - Navegación clara
✅ **Botones grandes** - Fácil de tocar
✅ **Información agrupada** - No scrolling infinito
✅ **Tiempo estimado visible** - Expectativa clara
✅ **Reconocimiento positivo** - Motivar siempre

---

Fin de documento.
