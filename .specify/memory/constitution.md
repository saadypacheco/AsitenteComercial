<!--
SYNC IMPACT REPORT
==================
Version change: (plantilla sin versión) → 1.0.0
Tipo de cambio: MAJOR (ratificación inicial de la constitución)

Principios definidos (nuevos):
  I.   Número de la líder intocable (NON-NEGOTIABLE)
  II.  Privacidad y soberanía de datos (NON-NEGOTIABLE)
  III. Trazabilidad total
  IV.  Robustez por arquitectura
  V.   Proveedor LLM desacoplado
  VI.  Mobile-first y multi-idioma

Secciones añadidas:
  - Restricciones técnicas y de stack
  - Flujo de desarrollo (SDD + Architect)
  - Governance

Templates revisados:
  ✅ .specify/templates/plan-template.md   — Constitution Check es genérico, sin cambios
  ✅ .specify/templates/spec-template.md    — sin referencias a principios hardcodeadas
  ✅ .specify/templates/tasks-template.md   — sin referencias a principios hardcodeadas

Follow-up TODOs: ninguno. Fecha de ratificación = fecha de creación del proyecto bajo
metodología Architect (2026-06-07).
-->

# Constitución de mentorcomercial

Plataforma de inteligencia comercial sobre WhatsApp para una líder de ventas de seguros
(~2.000 agentes). Esta constitución fija las reglas no negociables que toda feature, plan
e implementación DEBE respetar. Supersede cualquier práctica informal o decisión ad-hoc.

## Core Principles

### I. Número de la líder intocable (NON-NEGOTIABLE)

El número de WhatsApp y el iPhone de la líder NO se tocan jamás. Toda captura de mensajes
DEBE realizarse exclusivamente a través de un **número IA dedicado** (observador), conectado
vía bridge no oficial (WAHA). El riesgo de baneo DEBE quedar **aislado en ese número
descartable**: ninguna acción del sistema puede comprometer el número personal de la líder.

**Regla verificable:** ninguna ruta de código envía/recibe mensajes usando credenciales del
número de la líder. Cualquier feature que lo requiera se rechaza en Constitution Check.

**Rationale:** la continuidad operativa de la líder es el activo crítico del negocio; un baneo
de su número es un daño irreversible e inaceptable.

### II. Privacidad y soberanía de datos (NON-NEGOTIABLE)

Los datos son financieros y sensibles. Por lo tanto:
- El proveedor LLM DEBE operar en modo **no-retención** (sin entrenamiento ni almacenamiento
  del contenido enviado).
- La **transcripción de audio es self-host** (Whisper); el audio no sale a terceros.
- **RLS activo por defecto** en toda tabla con datos de negocio; el acceso se niega salvo
  política explícita.
- Los datos residen en **región EE.UU.** (infraestructura autogestionada en Hostinger/Docker).

**Regla verificable:** toda tabla nueva nace con RLS habilitado; todo llamado a LLM pasa por el
gateway con cabeceras de no-retención; ningún audio se envía a servicios externos.

**Rationale:** la confianza del cliente y el cumplimiento sobre datos sensibles son condición
de existencia del producto.

### III. Trazabilidad total

Todo **evento comercial** extraído por IA (venta, objeción, seguimiento, alerta, etc.) DEBE
ser auditable hasta el **mensaje origen** del que se derivó. No se persiste una conclusión sin
su evidencia enlazada.

**Regla verificable:** cada registro de evento comercial referencia el `message_id` (o lote de
mensajes) que lo originó; no existe evento huérfano sin traza.

**Rationale:** la líder toma decisiones sobre estos datos; una afirmación de la IA sin evidencia
verificable es indistinguible de una alucinación y erosiona la confianza.

### IV. Robustez por arquitectura

La fiabilidad se logra por diseño, no por esperanza:
- **Cola durable** entre captura e procesamiento (pgmq) — ningún mensaje se pierde si el worker
  cae.
- **Idempotencia en la ingesta** — reprocesar el mismo mensaje no duplica datos ni eventos.
- **Backups** regulares de la base.
- **Observabilidad** — logs estructurados y métricas en los puntos críticos (ingesta,
  transcripción, extracción).

**Regla verificable:** el camino captura→BD usa cola durable + clave de idempotencia; existe
política de backup; los handlers críticos emiten logs estructurados.

**Rationale:** la captura de WhatsApp es un flujo continuo y no reproducible; perder o duplicar
mensajes corrompe la memoria comercial de forma silenciosa.

### V. Proveedor LLM desacoplado

Todo acceso a modelos de lenguaje DEBE pasar por **LiteLLM**. La lógica de negocio nunca llama
a un SDK de proveedor concreto (Gemini, OpenAI, etc.) de forma directa.

**Regla verificable:** no hay imports directos de SDKs de proveedores LLM en el código de
negocio; el proveedor se cambia por configuración del gateway, sin tocar handlers.

**Rationale:** el mercado de LLMs cambia rápido (precio/calidad/disponibilidad); el desacople
evita un lock-in costoso y permite cambiar de modelo en minutos.

### VI. Mobile-first y multi-idioma

La gestión es prioritariamente desde el celular y los usuarios tienen bajo nivel técnico. Toda
interfaz DEBE:
- Diseñarse **mobile-first** (la pantalla chica es el caso base, no una adaptación).
- Soportar **multi-idioma** desde el inicio (sin strings hardcodeados en la UI).
- Priorizar **UX simple**: flujos cortos, lenguaje claro, mínima carga cognitiva.

**Regla verificable:** la UI no tiene texto visible hardcodeado fuera del sistema de i18n; los
flujos clave se validan en viewport móvil.

**Rationale:** si la herramienta no es usable desde el celular por alguien no técnico, no se
adopta — y una herramienta no adoptada no resuelve el problema.

## Restricciones técnicas y de stack

El stack está fijado por ADR (`2026-06-07-stack-mentorcomercial`, confidence: medium) y es
parte del contrato de este proyecto salvo nueva ADR que lo enmiende:

- **Frontend:** Next.js 14.
- **Backend:** FastAPI (Python).
- **Datos:** Supabase **self-hosted** (Postgres + RLS), cola con pgmq.
- **LLM:** Gemini Flash vía **LiteLLM** (intercambiable).
- **Transcripción:** Whisper **self-host**.
- **Captura WhatsApp:** bridge **WAHA** (no oficial) sobre número dedicado.
- **Infra:** Hostinger + Docker, autogestionada (single-node en F0, HA en F2).
- **Agente personal de la líder:** Telegram (capa de control separada de captura y dashboard).

Cualquier desviación del stack DEBE justificarse en `Complexity Tracking` del plan y, si es
estructural, registrarse como nueva ADR.

## Flujo de desarrollo (SDD + Architect)

El desarrollo sigue **Spec-Driven Development** sobre el ciclo de la metodología Architect:

1. `/architect-feature` registra la feature (ID F-NNN) y crea branch.
2. `/speckit-specify` → spec; `/speckit-clarify` cuando haya ambigüedad.
3. `/speckit-plan` → plan, con **Constitution Check** como gate obligatorio antes de research.
4. `/speckit-tasks` → tareas ordenadas por dependencia.
5. `/speckit-implement` → implementación.
6. `/architect-handoff` cierra cada sesión; el journey (`docs/architect-journey.md`) es la
   fuente de verdad del avance.

**Quality gates:** ninguna feature pasa a implementación con violaciones de Constitution Check
sin justificación explícita en `Complexity Tracking`. Las sesiones se mantienen cognitivamente
limpias (una fase por sesión) para no contaminar el razonamiento.

## Governance

Esta constitución supersede cualquier otra práctica. Su cumplimiento se verifica en cada
`/speckit-plan` (Constitution Check) y en la revisión de cada cambio.

**Procedimiento de enmienda:** toda modificación a esta constitución se documenta en el Sync
Impact Report (comentario al inicio del archivo), se versiona y, cuando afecta decisiones
estructurales de stack o arquitectura, se acompaña de la ADR correspondiente en la KB.

**Política de versionado (semver):**
- **MAJOR:** remoción/redefinición incompatible de un principio o de la gobernanza.
- **MINOR:** se agrega un principio o se amplía materialmente una guía.
- **PATCH:** aclaraciones, redacción, correcciones no semánticas.

**Revisión de cumplimiento:** todo plan e implementación declara explícitamente cómo respeta los
principios NON-NEGOTIABLE (I y II). La complejidad añadida DEBE justificarse; ante la duda, se
elige la opción más simple (YAGNI).

**Version**: 1.0.0 | **Ratified**: 2026-06-07 | **Last Amended**: 2026-06-07
