"""Configuración central. Las variables salen de backend/.env (ver .env.example)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    # Zona horaria fija del negocio para delimitar "hoy" (FR-018, ET con DST).
    # El día comercial va de 00:00 a 23:59 en esta zona, no en la del usuario.
    business_tz: str = "America/New_York"

    # Cola durable: 'pgmq' (recomendado) o 'table' (fallback processing_jobs).
    queue_backend: str = "pgmq"
    queue_name: str = "ai_processing"
    queue_max_attempts: int = 5           # tras N intentos → dead-letter

    # Supabase self-hosted (Postgres + Auth + Storage)
    supabase_url: str = ""
    supabase_service_role_key: str = ""   # NUNCA exponer al frontend (lesson KB)
    database_url: str = ""                # Postgres directo (migraciones / worker)
    # Pool de conexiones del API. Crítico contra una DB remota (Supabase Cloud):
    # reusar conexiones calientes en vez de abrir una nueva por consulta.
    db_pool_min: int = 1
    db_pool_max: int = 5                   # ojo con el límite del pooler de Supabase

    # Bridge WhatsApp (WAHA/Evolution) — red privada, no público
    waha_base_url: str = "http://waha:3000"
    waha_api_key: str = ""
    webhook_secret: str = ""              # HMAC para validar el webhook entrante

    # Auth — JWT self-contained (sin depender de Supabase Auth en local).
    jwt_secret: str = "mentorcomercial-dev-secret-change-in-prod"
    jwt_ttl_hours: int = 168               # 7 días
    magic_ttl_minutes: int = 15            # validez del magic link
    frontend_url: str = "http://localhost:3002"   # magic links + origen CORS permitido en prod
    # Usuario dueña (owner) que se asegura al arrancar. En dev usa los demo;
    # en prod, setear DEFAULT_LIDER_EMAIL/PASSWORD reales en el .env del server.
    default_lider_email: str = "cecilia@demo.com"
    default_lider_password: str = "demo1234"
    # Bootstrap del tenant en producción (primer arranque, sin datos demo).
    tenant_name: str = "Demo Líder"        # nombre de la agencia (tenant)
    observer_session: str = "default"      # nombre de la sesión WAHA = tenants.ia_wa_jid
    owner_wa_jid: str = ""                 # WhatsApp personal de la dueña (briefing); vacío = sin envío

    # Email (notificaciones + magic links). Abstracción de proveedor:
    #   'resend' → API HTTP de Resend (resend_api_key).
    #   'smtp'   → SMTP genérico (Gmail: smtp.gmail.com:587 + app password).
    #   ''       → modo log (no envía; útil en dev / sin proveedor).
    email_provider: str = ""
    email_from: str = "Asistente Comercial <onboarding@resend.dev>"
    resend_api_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # IA — Gemini por defecto vía LiteLLM, cambiable a cualquier proveedor
    llm_model: str = "gemini/gemini-2.0-flash"
    gemini_api_key: str = ""
    # openai_api_key / anthropic_api_key: completar si se cambia de proveedor

    # Zoom — asistencia automática (Server-to-Server OAuth). Vacío = no configurado:
    # la reconciliación funciona en modo simulado (andamiaje, sin credenciales).
    zoom_account_id: str = ""
    zoom_client_id: str = ""
    zoom_client_secret: str = ""
    zoom_min_minutos: int = 30             # minutos presentes para contar "asistió"

    # Transcripción self-hosted (multi-idioma)
    whisper_model: str = "small"          # tiny/base/small/medium/large-v3
    whisper_device: str = "cpu"           # 'cuda' si hay GPU

    storage_bucket: str = "wa-media"


settings = Settings()
