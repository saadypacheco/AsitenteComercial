# Plan de QA — Asistente Comercial (execally.online)

**Versión:** 2026-06-25  
**Rama:** `001-captura-whatsapp-bd`

| Entorno | Frontend | API |
|---|---|---|
| **Producción** | https://execally.online | https://api.execally.online |
| **Local (Docker)** | http://localhost:3002 | http://localhost:8002 |

> Para levantar el entorno local: `docker compose -f infra/docker-compose.local.yml up -d`

---

## 0. URLs a verificar

### Frontend (panel ejecutivo)

| URL | Descripción |
|---|---|
| `https://execally.online/` | Raíz — debe redirigir a `/login` o `/inicio` |
| `https://execally.online/login` | Login con email + contraseña |
| `https://execally.online/magic` | Verificación de magic link (panel) |
| `https://execally.online/inicio` | Dashboard principal (requiere auth) |
| `https://execally.online/hoy` | Actividad del día |
| `https://execally.online/hoy/[chatId]` | Detalle de chat (reemplazar [chatId] con uno real) |
| `https://execally.online/pendientes` | Bandeja de pendientes |
| `https://execally.online/acciones` | Bandeja de acciones IA |
| `https://execally.online/eventos` | Eventos comerciales |
| `https://execally.online/grupos` | Grupos de WhatsApp |
| `https://execally.online/mensajes` | Búsqueda de mensajes |
| `https://execally.online/agentes` | Gestión de agentes |
| `https://execally.online/clientes` | Gestión de clientes |
| `https://execally.online/capacitaciones` | Programa de capacitaciones |
| `https://execally.online/reuniones` | Actas de reuniones |
| `https://execally.online/reportes` | Reportes y gráficos |
| `https://execally.online/ia-insights` | Análisis IA (riesgo, oportunidades) |
| `https://execally.online/ajustes` | Configuración de la cuenta |
| `https://execally.online/lider/bienvenida` | Onboarding del líder (solo primera vez) |

### Frontend (app del agente — mobile)

| URL | Descripción |
|---|---|
| `https://execally.online/agente/login` | Login del agente (solicita magic link) |
| `https://execally.online/agente/magic` | Verificación del magic link del agente |
| `https://execally.online/agente` | App del agente (tabs: Hoy, Agenda, Ruta, Progreso, Simular, Ayuda) |

### Backend (API)

| URL | Método | Descripción |
|---|---|---|
| `https://api.execally.online/health` | GET | Health check (sin auth) |
| `https://api.execally.online/config/status` | GET | Estado del sistema (requiere auth) |
| `https://api.execally.online/auth/login` | POST | Login panel |
| `https://api.execally.online/auth/me` | GET | Usuario actual |
| `https://api.execally.online/dashboard/executive` | GET | KPIs del panel |
| `https://api.execally.online/dashboard/daily` | GET | Resumen del día |
| `https://api.execally.online/dashboard/acciones` | GET | Acciones sugeridas |
| `https://api.execally.online/dashboard/ai/summary` | GET | Resumen IA |
| `https://api.execally.online/dashboard/riesgo-agentes` | GET | Agentes en riesgo |
| `https://api.execally.online/dashboard/briefing/preview` | GET | Preview del briefing |
| `https://api.execally.online/gestion/agentes` | GET | Lista de agentes |
| `https://api.execally.online/gestion/pendientes` | GET | Lista de pendientes |
| `https://api.execally.online/gestion/grupos` | GET | Grupos WhatsApp |
| `https://api.execally.online/gestion/mensajes` | GET | Mensajes |
| `https://api.execally.online/gestion/eventos` | GET | Eventos comerciales |
| `https://api.execally.online/gestion/clientes` | GET | Clientes |
| `https://api.execally.online/gestion/capacitaciones` | GET | Capacitaciones |
| `https://api.execally.online/gestion/reuniones` | GET | Actas de reuniones |
| `https://api.execally.online/gestion/lider/onboarding` | GET | Estado onboarding |
| `https://api.execally.online/agente/auth/request` | POST | Solicitar magic link agente |
| `https://api.execally.online/agente/ruta` | GET | Ruta del agente |
| `https://api.execally.online/agente/ranking` | GET | Ranking del equipo |
| `https://api.execally.online/agente/journey` | GET | XP, nivel y misiones |
| `https://api.execally.online/agente/coach` | POST | Coach IA (RAG) |
| `https://api.execally.online/agente/simulador/chat` | POST | Simulador comercial |

---

## 1. Acceso y credenciales

### Panel ejecutivo — login en `/login`

> **Importante:** estas cuentas existen en la tabla `app_users`. Son las únicas que pueden acceder al panel ejecutivo (`/inicio`, `/acciones`, etc.).

#### Producción (https://execally.online)

| Usuario | Email | Contraseña | Rol | Alcance |
|---|---|---|---|---|
| Cecilia (dueña) | `saadypacheco@gmail.com` | `Cecilia2026` | Owner | Ve TODO el tenant |
| Juan (líder demo) | `lider@demo.com` | `demo1234` | Líder | Solo sub-árbol de Juan: Luis + Sofía |

#### Local (http://localhost:3002)

| Usuario | Email | Contraseña | Rol | Alcance |
|---|---|---|---|---|
| Cecilia (dueña) | `cecilia@demo.com` | `demo1234` | Owner | Ve TODO el tenant |
| Juan (líder demo) | `lider@demo.com` | `demo1234` | Líder | Solo sub-árbol de Juan: Luis + Sofía |

> Los usuarios locales son sembrados automáticamente por `ensure_default_user()` al arrancar el backend.  
> Configurables en `backend/app/core/config.py` → `default_lider_email` / `default_lider_password`.

> `lider@demo.com` está vinculado al agente **Juan Pérez** — por eso su alcance incluye a Luis y Sofía (que reportan a Juan), pero NO a María ni Ana.

### App del agente — login en `/agente/login`

Los agentes **no tienen contraseña**. Ingresan con magic link enviado a su email.  
En entorno local (development) el endpoint devuelve el link directamente en la respuesta JSON — no hace falta acceso al email.

| Agente | Email | Celular | Ciudad | Reporta a |
|---|---|---|---|---|
| María López | `maria@demo.com` | 5491111 | Miami | (raíz — ninguno) |
| Juan Pérez | `juan@demo.com` | 5492222 | Miami | María |
| Ana Torres | `ana@demo.com` | 5493333 | Orlando | María |
| Luis Gómez | `luis@demo.com` | 5494444 | Tampa | Juan |
| Sofía Ruíz | `sofia@demo.com` | 5495555 | Miami | Juan |

**Nota en producción:** el magic link llega al email real configurado. Si los agentes demo no tienen acceso a esos emails, usar el endpoint directamente:
```
POST https://api.execally.online/agente/auth/request
{ "email": "maria@demo.com" }
```
La respuesta incluye el campo `link` con el token completo (en modo dev).

> En producción el magic link llega al email. En local (dev) el endpoint devuelve el link directamente en la respuesta JSON.

---

## 2. Datos sembrados (estado inicial)

El entorno demo tiene precargado:
- 1 tenant: **"Agencia Cecilia"**
- 5 agentes con jerarquía: María → Juan/Ana → Luis/Sofía
- ~200 mensajes de WhatsApp simulados (7 días de actividad)
- 9 pendientes abiertos (3 críticos, 4 en proceso, 2 pendientes)
- 6 eventos comerciales (venta, objeción, seguimiento, consulta)
- 6 documentos en la base de conocimiento del coach IA

---

## 3. Rol OWNER (Cecilia)

### 3.1 Login y sesión

| # | Acción | Resultado esperado |
|---|---|---|
| O-01 | Ir a `/login`, ingresar `cecilia@demo.com` / `demo1234` y hacer click en "Ingresar" | Redirige a `/inicio` con nombre "Cecilia" en header |
| O-02 | Verificar chip de alcance en header | Muestra **"Toda la organización"** (no "Tu equipo") |
| O-03 | Refrescar la página | Sesión persiste (no vuelve al login) |
| O-04 | Cambiar idioma a English (EN) desde ajustes o selector | Toda la UI cambia al inglés |
| O-05 | Volver a Español | UI vuelve al español |
| O-06 | Click en "Salir" (logout) | Redirige a `/login`, token destruido |

### 3.2 /inicio — Centro de Control

| # | Acción | Resultado esperado |
|---|---|---|
| O-07 | Cargar `/inicio` | Aparecen los 5 KPIs: Conversaciones, Ventas $, Críticos, En riesgo, Conectados |
| O-08 | Verificar tendencias (flechas ▲▼) | Al menos un KPI muestra flecha de tendencia con % |
| O-09 | Sección "Estado del equipo" | Muestra bandas: Saturada / Normal / Excelente con agentes |
| O-10 | Sección "Alertas" | Lista de alertas priorizadas con nivel (crítico/alto/medio) |
| O-11 | Sección "Top Agentes" | Lista con nombre, ventas y % conversión |
| O-12 | Sección "Oportunidades" | Lista con potencial $ y probabilidad % |
| O-13 | Sección "Actividad (7d)" | Gráfico de barras de últimos 7 días |
| O-14 | Sección "Recomendaciones IA" | Al menos 2 recomendaciones con icono y texto |
| O-15 | Campo de pregunta IA ("Preguntale algo...") → escribir "¿Quién está más activo?" | Responde con texto (fallback determinista si Gemini no está activo) |

### 3.3 /acciones — Bandeja de acciones

| # | Acción | Resultado esperado |
|---|---|---|
| O-16 | Cargar `/acciones` | Muestra tarjetas de acciones sugeridas por la IA |
| O-17 | Verificar banner de estado (WhatsApp/email) | Muestra íconos verdes (activos) o ámbar (simulado) |
| O-18 | Click en "Aprobar" en una acción de WhatsApp | Aparece confirmación de envío con modo (real/simulado) |
| O-19 | Click en "Aprobar" en una acción de email | Igual, con canal correcto |
| O-20 | Click en "Aprobar todas" (si existe el botón) | Ejecuta todas las acciones pendientes en lote |
| O-21 | Verificar que la acción desaparece del listado tras aprobar | La tarjeta se quita o marca como enviada |

### 3.4 /pendientes

| # | Acción | Resultado esperado |
|---|---|---|
| O-22 | Cargar `/pendientes` | Muestra barra de progreso global + lista de pendientes |
| O-23 | Verificar conteos (total, críticos, cerrados) | Coinciden con los números en la barra superior |
| O-24 | Filtrar por "Críticos" | Solo muestra pendientes con prioridad crítica |
| O-25 | Filtrar por "Sin asignar" | Solo muestra pendientes sin agente asignado |
| O-26 | Crear nuevo pendiente: click en "+" → título "Test QA" → Guardar | Aparece en el listado |
| O-27 | Editar el pendiente creado → cambiar prioridad a "alto" | Se actualiza correctamente |
| O-28 | Cerrar/eliminar el pendiente de test | Desaparece del listado abierto |
| O-29 | Click "Escalar" en un pendiente existente | Prioridad sube a "crítico" |

### 3.5 /clientes

| # | Acción | Resultado esperado |
|---|---|---|
| O-30 | Cargar `/clientes` | Muestra stats (total, por renovar, sin seguimiento, valor) + listado |
| O-31 | Filtrar por "Por renovar" | Solo clientes con renovación próxima |
| O-32 | Filtrar por "Sin contacto" | Solo clientes sin contacto reciente |
| O-33 | Crear cliente nuevo | Aparece en el listado |
| O-34 | Registrar contacto en un cliente | Se actualiza la fecha de último contacto |

### 3.6 /agentes

| # | Acción | Resultado esperado |
|---|---|---|
| O-35 | Cargar `/agentes` | Muestra mapa + lista de agentes con estado y ubicación |
| O-36 | Verificar vista árbol jerárquico | María en raíz, Juan/Ana debajo, Luis/Sofía al fondo |
| O-37 | Crear nuevo agente: "Pedro García" | Aparece en la lista |
| O-38 | Editar el agente Pedro: agregar celular y ciudad | Se guarda |
| O-39 | Dar de baja a Pedro | Desaparece de la lista activa |
| O-40 | **Designar a Juan como Líder** (solo owner puede) | Juan aparece con badge "Líder", botón aparece en panel |
| O-41 | **Quitar rol de Líder a Juan** | Badge desaparece |

### 3.7 /grupos, /mensajes, /eventos

| # | Acción | Resultado esperado |
|---|---|---|
| O-42 | Cargar `/grupos` | Lista de grupos WhatsApp con nombre, mensajes y estado |
| O-43 | Cargar `/mensajes` | Feed de mensajes con filtros por tipo |
| O-44 | Filtrar mensajes por "audio" | Solo mensajes de tipo audio |
| O-45 | Buscar un término en mensajes | Devuelve resultados relevantes |
| O-46 | Cargar `/eventos` | Lista de eventos comerciales con tipo y probabilidad |
| O-47 | Filtrar eventos por "venta" | Solo eventos de tipo venta |

### 3.8 /reuniones

| # | Acción | Resultado esperado |
|---|---|---|
| O-48 | Cargar `/reuniones` | Muestra las actas procesadas |
| O-49 | Crear nueva reunión: ingresar título + transcripción de texto libre | Genera resumen, temas y lista de acciones |
| O-50 | Verificar que las acciones de la reunión crean pendientes | Aparecen en `/pendientes` |

### 3.9 /capacitaciones

| # | Acción | Resultado esperado |
|---|---|---|
| O-51 | Cargar `/capacitaciones` | Muestra barra de progreso global + etapas + progreso por agente |
| O-52 | Verificar calendario de sesiones | Muestra sesiones con fecha y estado |

### 3.10 /ia-insights

| # | Acción | Resultado esperado |
|---|---|---|
| O-53 | Cargar `/ia-insights` | Muestra recomendaciones, resumen, bloques de análisis |
| O-54 | Bloque "Agentes en riesgo de abandono" | Lista agentes con score (0-100) y nivel (alto/medio) |
| O-55 | Bloque "Saturados" | Lista agentes con carga alta |
| O-56 | Chat IA: escribir "¿quién necesita atención urgente?" | Responde con datos del equipo |

### 3.11 /reportes

| # | Acción | Resultado esperado |
|---|---|---|
| O-57 | Cargar `/reportes` | Muestra 4 gráficos: actividad, ventas, eventos, pipeline |
| O-58 | Verificar que los números son coherentes con `/inicio` | No deben haber contradicciones mayores |

### 3.12 /ajustes

| # | Acción | Resultado esperado |
|---|---|---|
| O-59 | Cargar `/ajustes` | Muestra perfil, idioma, estado IA, briefing diario |
| O-60 | Sección "Estado del sistema" | Muestra si IA / WhatsApp / Email están activos o en modo simulado |
| O-61 | Configurar briefing diario: ingresar número y hora | Se guarda sin error |
| O-62 | Click en "Enviar prueba" del briefing | Muestra respuesta (modo real o simulado) |
| O-63 | Click en "Ver preview" | Muestra texto del briefing sin enviar |

---

## 4. Rol LÍDER (Juan Pérez como líder demo)

> El líder usa las mismas páginas que el owner pero **todo filtrado a su sub-árbol**.  
> `lider@demo.com` corresponde a **Juan Pérez** — su alcance incluye solo a **Luis Gómez** y **Sofía Ruíz** (que reportan a Juan). María y Ana quedan fuera de su alcance.

### 4.1 Login y onboarding

| # | Acción | Resultado esperado |
|---|---|---|
| L-01 | Ingresar con `lider@demo.com` / `demo1234` | Si nunca completó onboarding → redirige a `/lider/bienvenida` |
| L-02 | Página `/lider/bienvenida` | Muestra 5 pasos guiados con íconos y descripción |
| L-03 | Click en "Comenzar" | Marca onboarding como completado, redirige a `/inicio` |
| L-04 | Volver a `/lider/bienvenida` después de completar | Redirige a `/inicio` (no vuelve a mostrar el onboarding) |
| L-05 | Chip de alcance en header | Muestra **"Tu equipo"** (no "Toda la organización") |

### 4.2 Aislamiento de datos (crítico)

| # | Acción | Resultado esperado |
|---|---|---|
| L-06 | `/inicio` KPIs | Solo muestra datos de Luis y Sofía (sub-árbol de Juan) |
| L-07 | `/agentes` | Lista solo a **Luis Gómez** y **Sofía Ruíz** — NO María, Ana, Juan |
| L-08 | `/pendientes` | Solo pendientes asignados a Luis y Sofía |
| L-09 | `/acciones` | Solo acciones sugeridas para el sub-árbol de Juan |
| L-10 | Intentar ver agentes de otra rama | No deben aparecer (María, Ana no visibles) |
| L-11 | `/ia-insights` agentes en riesgo | Solo Luis y Sofía |

---

## 5. Rol AGENTE (app mobile)

### 5.1 Login por magic link

| # | Acción | Resultado esperado |
|---|---|---|
| A-01 | Ir a `/agente/login` | Muestra campo para celular o email |
| A-02 | Ingresar `maria@demo.com` y click en "Enviar enlace" | Responde "ok: true". En dev incluye el link en la respuesta |
| A-03 | Abrir el magic link | Redirige a `/agente/magic?token=...` → autentica y redirige a `/agente` |
| A-04 | Refrescar `/agente` | Sesión persiste (TTL: 24h) |
| A-05 | Intentar acceder a `/inicio` como agente | Redirige al login del panel (rol incorrecto) |

### 5.2 Tabs principales del agente

| # | Tab | Resultado esperado |
|---|---|---|
| A-06 | **Hoy** | Score del agente (XP + nivel), misiones activas, resumen del día |
| A-07 | **Agenda** | Lista de sesiones de capacitación próximas con fecha y Zoom |
| A-08 | **Ruta** | Stepper con etapas (pendiente/en_curso/completado), barra de progreso |
| A-09 | **Progreso** | Gráfico de XP, racha de días activos, logros |
| A-10 | **Logros** | Insignias desbloqueadas e íconos de las no desbloqueadas |

### 5.3 Ruta de aprendizaje

| # | Acción | Resultado esperado |
|---|---|---|
| A-11 | Tab "Ruta": verificar etapa en curso | Una etapa muestra estado "en_curso" |
| A-12 | Click en "Avanzar" en la etapa en curso | Etapa pasa a "completado", siguiente pasa a "en_curso" |
| A-13 | Click "Avanzar" en una etapa ya completada | No hace nada (idempotente) |
| A-14 | Barra de progreso arriba | % actualizado después de avanzar |

### 5.4 Ranking

| # | Acción | Resultado esperado |
|---|---|---|
| A-15 | Tab "Progreso" → sección ranking | Muestra posición del agente vs equipo |
| A-16 | Verificar que el agente ve su propia posición marcada | Fila del agente resaltada (campo `yo: true`) |

### 5.5 Coach IA (tab Ayuda)

| # | Acción | Resultado esperado |
|---|---|---|
| A-17 | Tab "Ayuda" → escribir "¿cómo manejo la objeción de precio?" | Responde con técnica específica (fuente: KB o fallback texto) |
| A-18 | Verificar que muestra las fuentes citadas | Aparecen los títulos de los documentos usados |
| A-19 | Pregunta sin respuesta: "¿cuál es el precio de AAPL?" | Responde "no tengo información sobre ese tema" (no inventa) |

### 5.6 Simulador comercial IA (tab Simular)

| # | Acción | Resultado esperado |
|---|---|---|
| A-20 | Tab "Simular" → seleccionar escenario "Primera llamada" | Aparece descripción del escenario |
| A-21 | Escribir "Hola, llamo de AIG para hablar de su protección familiar" | El cliente virtual responde (modo simulado o LLM) |
| A-22 | Continuar la conversación 4-5 turnos | El cliente evoluciona con respuestas progresivas |
| A-23 | Al terminar (turno 5) | Aparece sección "Feedback" con evaluación del desempeño |
| A-24 | Click "Nueva simulación" | Reinicia el chat |
| A-25 | Seleccionar escenario "Manejo de objeciones" | Respuestas del cliente con objections distintas |
| A-26 | Seleccionar escenario "Cierre de venta" | El cliente evalúa antes de comprometerse |

---

## 6. Bot de Telegram (@execally_bot)

| # | Acción | Resultado esperado |
|---|---|---|
| T-01 | Buscar `@execally_bot` en Telegram y abrir chat | Aparece el bot |
| T-02 | Enviar "hola" | El bot responde con saludo y oferta de ayuda |
| T-03 | Preguntar "¿cómo está mi equipo?" | Responde con resumen del equipo (modo IA o fallback determinista) |
| T-04 | Preguntar "¿quién tiene pendientes críticos?" | Lista agentes con pendientes críticos |
| T-05 | Enviar un mensaje sin sentido | Responde de forma genérica sin error |

---

## 7. Integraciones y estado del sistema

### 7.1 Health check

| # | Acción | Resultado esperado |
|---|---|---|
| H-01 | `GET https://api.execally.online/health` | `{"status": "ok", "db": "ok", "bridge": "WORKING", "environment": "production"}` |
| H-02 | Si db = "error" | Escalar inmediatamente — Supabase Cloud no responde |
| H-03 | Si bridge = "STOPPED" o "error" | WhatsApp desconectado — captura de mensajes detenida |

### 7.2 Estado de configuración

| # | Acción | Resultado esperado |
|---|---|---|
| C-01 | `GET https://api.execally.online/config/status` (con Bearer token) | Devuelve ia_enabled, whatsapp_enabled, email_enabled, environment |
| C-02 | ia_enabled = false | Gemini sin billing — el sistema usa fallback determinista (OK) |
| C-03 | whatsapp_enabled = true | WAHA conectado — acciones se envían de verdad |
| C-04 | email_enabled = true | Resend configurado — emails se envían de verdad |

---

## 8. Seguridad — casos límite

| # | Caso | Resultado esperado |
|---|---|---|
| S-01 | Acceder a `/inicio` sin estar logueado | Redirige a `/login` |
| S-02 | Acceder a `/agente` sin token de agente | Redirige a `/agente/login` |
| S-03 | Acceder a `/agente` con token de líder/owner | Redirige al login (rol incorrecto) |
| S-04 | Usar magic link de agente dos veces | Segunda vez: "Token inválido o expirado" (TTL 15 min) |
| S-05 | Modificar manualmente el JWT en LocalStorage | Respuesta 401 "Token inválido" |
| S-06 | Líder intenta ver datos de otro tenant (manipulando parámetros) | Solo ve su propio tenant (tenant_id en JWT) |
| S-07 | Agente intenta acceder a un endpoint del panel (`/dashboard/command`) | 403 "Acceso restringido" |
| S-08 | POST al webhook sin HMAC signature (si WEBHOOK_SECRET está activo) | 401 "firma inválida" |

---

## 9. Rendimiento y UX

| # | Métrica | Umbral aceptable |
|---|---|---|
| P-01 | Tiempo de carga de `/inicio` (primer render) | < 3 segundos |
| P-02 | Tiempo de respuesta de cualquier API call | < 2 segundos |
| P-03 | Cambio de idioma (es → en) | < 1 segundo (sin recarga) |
| P-04 | Render en mobile (375px de ancho) | Sin scroll horizontal, sin elementos cortados |
| P-05 | Login completo (email → dashboard) | < 5 segundos total |

---

## 10. Flujos end-to-end completos

### E2E-01: Líder aprueba una acción para un agente en riesgo
1. Login como `cecilia@demo.com`
2. Ir a `/ia-insights` → ver "Agentes en riesgo de abandono"
3. Ir a `/acciones` → encontrar acción de tipo "reconectar agente"
4. Leer el mensaje redactado, click "Aprobar"
5. Verificar modo (real/simulado) en la confirmación
6. Ir a `/pendientes` → verificar que se creó un pendiente de seguimiento

### E2E-02: Agente avanza en su ruta y el líder lo ve
1. Login como agente `juan@demo.com` → `/agente`
2. Tab "Ruta" → click "Avanzar" en la etapa en curso
3. Verificar que la barra de progreso sube
4. Login como `lider@demo.com`
5. Ir a `/capacitaciones` → verificar que el progreso de Juan se actualizó

### E2E-03: Líder procesa una reunión y se crean tareas
1. Login como `lider@demo.com`
2. Ir a `/reuniones` → "Nueva reunión"
3. Titulo: "Reunión semanal", pegar texto de transcripción libre
4. Click "Procesar"
5. Verificar resumen generado + lista de acciones
6. Ir a `/pendientes` → confirmar que las acciones aparecen como pendientes

### E2E-04: Agente practica venta con el simulador
1. Entrar a `/agente` como `maria@demo.com`
2. Tab "Simular" → escenario "Primera llamada"
3. Completar 5 turnos de conversación
4. Leer el feedback al finalizar
5. Cambiar a escenario "Manejo de objeciones" → nueva simulación
6. Verificar que el chat se reinicia limpio

### E2E-05: Owner revisa el health del sistema
1. `GET https://api.execally.online/health`
2. Verificar db=ok, bridge=WORKING
3. Login como `cecilia@demo.com` → `/ajustes`
4. Verificar que los íconos de estado coinciden con el health

---

## 11. Checklist final antes de release

- [ ] Todos los roles pueden hacer login y logout correctamente
- [ ] El alcance del líder está correctamente acotado a su equipo
- [ ] Los agentes NO pueden acceder al panel ejecutivo
- [ ] Las acciones de WhatsApp muestran modo (real/simulado) correctamente
- [ ] La app del agente funciona en mobile (375px)
- [ ] El simulador completa 5 turnos y muestra feedback
- [ ] El coach IA responde con fuentes
- [ ] El health check devuelve `"status": "ok"`
- [ ] Cambiar idioma (ES/EN) funciona en todas las páginas
- [ ] Crear/editar/eliminar un pendiente funciona
- [ ] El onboarding del líder se muestra solo una vez
- [ ] El bot de Telegram responde en menos de 10 segundos

---

## 12. Reportar un bug

Al encontrar un bug, documentar:

1. **Rol** usado (Owner / Líder / Agente)
2. **URL** exacta
3. **Pasos** para reproducirlo (numerados)
4. **Resultado obtenido**
5. **Resultado esperado**
6. **Screenshot** si aplica

Reportar a: `saadypacheco@gmail.com`
