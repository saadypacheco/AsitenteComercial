# Despliegue a producción — mentorcomercial (VPS Hostinger + Traefik)

Runbook paso a paso. El VPS ya corre **Traefik** (reverse proxy + TLS Let's Encrypt)
para `solucionesdentales` y otros; mentorcomercial se enchufa con el mismo patrón.
**DB = Supabase Cloud** (no se corre Postgres en el VPS).

- **VPS IP:** `76.13.234.191`  ·  **OS:** Ubuntu 24.04  ·  **red Traefik:** `traefik` (externa)
- **Artefactos:** [docker-compose.prod.yml](../docker-compose.prod.yml) · [.env.prod.example](../.env.prod.example) · [backend/.env.prod.example](../backend/.env.prod.example)

---

## 0. Prerequisitos (hacelos en paralelo)

- [ ] **Dominio** registrado (ej. `mentorcomercial.shop`) en Hostinger.
- [ ] **DNS**: 3 registros **A** → `76.13.234.191`
  - `@`  → 76.13.234.191
  - `www` → 76.13.234.191
  - `api` → 76.13.234.191
  - (Esperá la propagación; verificá con `nslookup api.tudominio` o https://dnschecker.org)
- [ ] **Supabase Cloud** con el `DATABASE_URL` a mano (ver paso 1).
- [ ] Acceso **SSH** al VPS (`ssh root@76.13.234.191`).

---

## 1. Supabase Cloud — DB y migraciones

1. Entrá a https://supabase.com → tu proyecto. Si no existe, creá uno (región EE.UU.).
2. **Project Settings → Database → Connection string → URI.** Copiá el string. Para
   correr migraciones usá la **conexión directa** (puerto 5432) o **Session pooler**
   (no la "Transaction"/6543, que no soporta todo el DDL). Reemplazá `[YOUR-PASSWORD]`.
3. Habilitá **pgvector**: Database → Extensions → activar `vector` (lo usa la migración 0001).
4. **Aplicar migraciones** (desde tu PC o el VPS, con el repo clonado):
   ```bash
   sudo apt-get install -y postgresql-client        # si no tenés psql
   export DB="postgresql://postgres:....@....supabase.com:5432/postgres"
   for f in backend/migrations/*.sql; do echo ">> $f"; psql "$DB" -f "$f" || break; done
   ```
   > Esto crea el esquema + catálogos (i18n, etc.). **NO** corras los seeds de
   > `infra/local-init/` (son datos demo). El tenant + la dueña los crea la app sola
   > en el primer arranque (paso 5), sin datos falsos.

---

## 2. Clonar el repo en el VPS

```bash
ssh root@76.13.234.191
mkdir -p /opt && cd /opt
git clone <URL-del-repo-privado> mentorcomercial    # remote 'private' (mentorcomercial)
cd mentorcomercial
git checkout 001-captura-whatsapp-bd                 # o main, según dónde esté el código
```

---

## 3. Variables de entorno (en el VPS)

```bash
# (1) compose — substitución de ${DOMAIN}, build args:
cp .env.prod.example .env
nano .env            # DOMAIN=tudominio  ·  WAHA_API_KEY=<clave fuerte>  ·  (supabase pub opc.)

# (2) backend + worker:
cp backend/.env.prod.example backend/.env
nano backend/.env    # completar:
#   ENVIRONMENT=production
#   DATABASE_URL=<string Supabase>
#   JWT_SECRET=<openssl rand -hex 32>
#   FRONTEND_URL=https://<DOMAIN>
#   DEFAULT_LIDER_EMAIL / DEFAULT_LIDER_PASSWORD  (login real de Cecilia)
#   TENANT_NAME, OBSERVER_SESSION=default, OWNER_WA_JID=<wsp Cecilia para briefing, opc>
#   WAHA_API_KEY=<la MISMA que en .env raíz>   ·  WAHA_BASE_URL=http://mc-waha:3000
#   WEBHOOK_SECRET=  (vacío por ahora)  ·  GEMINI_API_KEY=<opc>
```
Generá secretos fuertes:
```bash
openssl rand -hex 32     # para JWT_SECRET
openssl rand -hex 24     # para WAHA_API_KEY (poné el mismo valor en ambos .env)
```

---

## 4. Levantar (build + up)

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml ps
docker logs mc-backend --tail 30        # buscá "api.startup" y "auth.seed.tenant/ok"
```
La primera vez compila el frontend (Next build) y el backend — puede tardar varios minutos.

---

## 5. Verificar el panel (HTTPS por Traefik)

- Abrí `https://<DOMAIN>` → debería cargar el login (Traefik emite el cert TLS solo;
  la 1ª vez puede tardar ~1 min).
- `https://api.<DOMAIN>/health` → responde.
- Login con `DEFAULT_LIDER_EMAIL` / `DEFAULT_LIDER_PASSWORD`. Entrás como Cecilia (owner).
  > Si da error de CORS, revisá que `FRONTEND_URL` en `backend/.env` = `https://<DOMAIN>`.

---

## 6. Conectar el celular observador (WAHA)

WAHA no está expuesto al público (correcto). Para escanear el QR, abrí su panel por un
**túnel SSH temporal**:

```bash
# en el VPS: publicá WAHA solo en loopback, temporalmente
docker compose -f docker-compose.prod.yml stop mc-waha
#   editá docker-compose.prod.yml y agregá bajo mc-waha:
#     ports: ["127.0.0.1:4500:3000"]
docker compose -f docker-compose.prod.yml up -d mc-waha
```
```bash
# en tu PC: túnel al VPS
ssh -L 4500:localhost:4500 root@76.13.234.191
```
- Abrí en tu PC `http://localhost:4500` (API key = `WAHA_API_KEY`).
- Iniciá la sesión **`default`** (debe coincidir con `OBSERVER_SESSION`) → mostrá el QR.
- En el **celular nuevo**: WhatsApp → *Dispositivos vinculados* → *Vincular dispositivo* → escaneá.
- Esperá estado **WORKING**. El `tenants.ia_wa_jid` ya quedó en `'default'` (bootstrap).
- **Cerrá el túnel, sacá el `ports:` temporal y volvé a `up -d mc-waha`** (que quede interno).

> ⚠️ Mantené el celular con internet. La sesión se guarda en el volumen `waha_sessions`
> (sobrevive reinicios). **Hacé backup de ese volumen** para no re-escanear el QR.

---

## 7. Conectar los grupos y probar la captura

1. Con el número observador, **entrá (o que lo agreguen) a 1 grupo de prueba**. Empezá
   con pocos grupos para no levantar sospechas de WhatsApp (riesgo de baneo).
2. Mandá un mensaje en el grupo.
3. En el panel → **/mensajes**: debería aparecer en segundos. El worker lo clasifica
   y extrae eventos.
   ```bash
   docker logs mc-backend --tail 20    # "capture.message ..."
   docker logs mc-worker  --tail 20    # "worker.job ..."
   ```

---

## 8. Operación

- **Logs:** `docker logs -f mc-backend|mc-worker|mc-waha`
- **Reiniciar:** `docker compose -f docker-compose.prod.yml restart mc-backend`
- **Actualizar código:** `git pull && docker compose -f docker-compose.prod.yml up -d --build`
- **Swap** (el VPS no tiene; red de seguridad recomendada):
  ```bash
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```
- **Reinicio pendiente del sistema** (`*** System restart required ***`): coordinalo
  (kernel nuevo). Tras reboot, Docker levanta todo solo (`restart: unless-stopped`).
- **Backups:** volumen `waha_sessions` (sesión WhatsApp) + la DB la respalda Supabase.

---

## 9. Endurecimiento pendiente (post-MVP)

- [ ] **HMAC del webhook:** hoy `WEBHOOK_SECRET` vacío y `/ingest/webhook` queda público
      vía Traefik. El backend valida con **sha256**; al activarlo, configurar WAHA con el
      mismo algoritmo (`WHATSAPP_HOOK_HMAC_KEY` + algoritmo sha256) o no capturará.
- [ ] Restringir `/ingest/*` por IP/red en Traefik (que no sea público).
- [ ] Rotar `DEFAULT_LIDER_PASSWORD` tras el primer login.
- [ ] Monitoreo de la sesión WAHA (alerta si se desconecta) + healthchecks.
- [ ] `GEMINI_API_KEY` para resúmenes con IA real (hoy fallback determinista).
