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

    # Bridge WhatsApp (WAHA/Evolution) — red privada, no público
    waha_base_url: str = "http://waha:3000"
    waha_api_key: str = ""
    webhook_secret: str = ""              # HMAC para validar el webhook entrante

    # Auth — JWT self-contained (sin depender de Supabase Auth en local).
    jwt_secret: str = "mentorcomercial-dev-secret-change-in-prod"
    jwt_ttl_hours: int = 168               # 7 días
    # Usuario líder por defecto que se siembra al arrancar (solo dev).
    default_lider_email: str = "cecilia@demo.com"
    default_lider_password: str = "demo1234"

    # IA — Gemini por defecto vía LiteLLM, cambiable a cualquier proveedor
    llm_model: str = "gemini/gemini-2.0-flash"
    gemini_api_key: str = ""
    # openai_api_key / anthropic_api_key: completar si se cambia de proveedor

    # Transcripción self-hosted (multi-idioma)
    whisper_model: str = "small"          # tiny/base/small/medium/large-v3
    whisper_device: str = "cpu"           # 'cuda' si hay GPU

    storage_bucket: str = "wa-media"


settings = Settings()
