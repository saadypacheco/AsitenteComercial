"""Envío de emails — abstracción de proveedor (Resend por defecto, SMTP/Gmail intercambiable).

Cambiar de proveedor = tocar `settings.email_provider` (+ sus credenciales), sin tocar
el código que lo usa (magic links, notificaciones).

  - 'resend' → API HTTP de Resend (RESEND_API_KEY). Recomendado.
  - 'smtp'   → SMTP genérico. Para Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587,
               SMTP_USER=tucuenta@gmail.com, SMTP_PASSWORD=<app password de Google>.
  - ''       → modo log: no envía, solo loguea (dev / sin proveedor configurado).

`send_email` NUNCA lanza: aísla el fallo de envío para no tumbar el endpoint que llama.
"""
import structlog

from app.core.config import settings

logger = structlog.get_logger()


def enabled() -> bool:
    """True si hay un proveedor de email configurado (si no, los envíos van en modo log)."""
    return settings.email_provider in ("resend", "smtp")


def send_email(to: str, subject: str, html: str, text: str | None = None) -> dict:
    """Envía un email. Devuelve {sent: bool, modo: 'resend'|'smtp'|'simulado'|'error'}."""
    if not to:
        return {"sent": False, "modo": "error"}
    provider = settings.email_provider
    if provider == "resend":
        return _send_resend(to, subject, html, text)
    if provider == "smtp":
        return _send_smtp(to, subject, html, text)
    logger.info("email.simulado", to=to, subject=subject)
    return {"sent": False, "modo": "simulado"}


def _send_resend(to: str, subject: str, html: str, text: str | None) -> dict:
    try:
        import httpx  # import diferido (no necesario en modo log)

        payload = {"from": settings.email_from, "to": [to], "subject": subject, "html": html}
        if text:
            payload["text"] = text
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        logger.info("email.resend.ok", to=to)
        return {"sent": True, "modo": "resend"}
    except Exception as exc:  # noqa: BLE001
        logger.warning("email.resend.error", to=to, error=str(exc))
        return {"sent": False, "modo": "error"}


def _send_smtp(to: str, subject: str, html: str, text: str | None) -> dict:
    try:
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.email_from
        msg["To"] = to
        if text:
            msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as s:
            s.starttls()
            s.login(settings.smtp_user, settings.smtp_password)
            s.sendmail(settings.smtp_user, [to], msg.as_string())
        logger.info("email.smtp.ok", to=to)
        return {"sent": True, "modo": "smtp"}
    except Exception as exc:  # noqa: BLE001
        logger.warning("email.smtp.error", to=to, error=str(exc))
        return {"sent": False, "modo": "error"}


def send_magic_link(to: str, link: str, lang: str = "es") -> dict:
    """Email con el enlace de acceso (magic link). Localizado es/en."""
    mins = settings.magic_ttl_minutes
    if lang == "en":
        subject = "Your access link"
        html = (
            "<p>Hi! 👋</p><p>Here's your secure sign-in link:</p>"
            f"<p><a href=\"{link}\" style=\"background:#4f46e5;color:#fff;padding:10px 18px;"
            "border-radius:8px;text-decoration:none;display:inline-block\">Sign in</a></p>"
            f"<p style=\"color:#888;font-size:13px\">It expires in {mins} minutes. "
            "If you didn't request it, ignore this email.</p>"
        )
    else:
        subject = "Tu enlace de acceso"
        html = (
            "<p>¡Hola! 👋</p><p>Este es tu enlace de acceso seguro:</p>"
            f"<p><a href=\"{link}\" style=\"background:#4f46e5;color:#fff;padding:10px 18px;"
            "border-radius:8px;text-decoration:none;display:inline-block\">Ingresar</a></p>"
            f"<p style=\"color:#888;font-size:13px\">Vence en {mins} minutos. "
            "Si no lo pediste, ignorá este correo.</p>"
        )
    return send_email(to, subject, html, text=link)
