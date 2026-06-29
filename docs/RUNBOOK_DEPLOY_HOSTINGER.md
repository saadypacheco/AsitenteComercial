# Runbook genérico — Desplegar un proyecto a Hostinger (VPS + Traefik + Supabase Cloud)

Guía **reutilizable** para subir cualquier repo (mentorcomercial, amandaclouthing,
solucionesdentales, …) al VPS de Hostinger. Probada end-to-end con mentorcomercial
(2026-06-12). Reemplazá los marcadores `<...>` por los valores de cada proyecto.

| Marcador | Ejemplo (mentorcomercial) |
|---|---|
| `<PROYECTO>` | `mentorcomercial` (carpeta `/docker/<PROYECTO>`) |
| `<DOMINIO>` | `execally.online` |
| `<IP_VPS>` | `76.13.234.191` |
| `<REPO>` | `saadypacheco/mentorcomercial` |

---

## 1. Arquitectura y decisiones (el "por qué")

```
Internet → Traefik (ya en el VPS, :80/:443, TLS Let's Encrypt automático)
              ├─ <DOMINIO>        → <proyecto>-frontend  (:3000)
              └─ api.<DOMINIO>    → <proyecto>-backend   (:8002 u :8000)
           red interna privada:   backend ↔ worker ↔ waha/otros
           DB → Supabase Cloud (DATABASE_URL)
```

- **Un VPS, varios proyectos.** Cada uno vive en `/docker/<PROYECTO>` con su
  `docker-compose.prod.yml` y su dominio. Conviven porque **no publican puertos**:
  Traefik los enruta por dominio vía *labels* sobre la red externa `traefik`.
- **DB en Supabase Cloud** (Postgres administrado, backups incluidos) → el VPS no corre
  Postgres. Más liviano y simple.
- **TLS automático**: Traefik + Let's Encrypt emiten el certificado solo cuando el DNS
  del dominio apunta al VPS. No se tocan certificados a mano.
- **Sin datos demo en producción**: la app crea su tenant + usuario dueño en el primer
  arranque (`ENVIRONMENT=production`).

---

## 2. Prerequisitos (una vez por proyecto)

1. **Repo en GitHub.** Si es **privado**, necesitás un **token** para clonarlo en el VPS
   (ver §3). Si es público, no hace falta.
2. **Proyecto en Supabase Cloud** → tener a mano el **connection string** (§4).
3. **Dominio** en Hostinger → configurar **3 registros A** apuntando al VPS (§5).
4. En el repo, ya versionados:
   - `docker-compose.prod.yml` con labels de Traefik **parametrizados por `${DOMAIN}`**.
   - Plantillas `.env.prod.example` (raíz + backend).
   - El backend debe leer su config de variables de entorno (no hardcodear localhost).
5. **Acceso SSH** al VPS (`ssh root@<IP_VPS>` o la terminal web de Hostinger).

> El VPS ya tiene: Docker, Traefik corriendo en `:80/:443` con la red externa `traefik`
> y un resolver ACME llamado `letsencrypt`. (Si montás un VPS nuevo, eso es setup aparte.)

---

## 3. GitHub privado → token para clonar

Los repos **públicos** se clonan directo. Para uno **privado**:

1. github.com → avatar → **Settings → Developer settings → Personal access tokens →
   Tokens (classic) → Generate new token (classic)**.
   - Scope: **`repo`** (control total de repos privados). Expiración: 90 días.
   - *(Los fine-grained tokens también sirven pero dan 403 si no se setea bien el repo +
     permiso `Contents: Read-only`. El classic es más a prueba de errores.)*
2. Copiá el token (`ghp_…`).
3. Clonar en el VPS (reemplazando `TU_TOKEN`):
   ```bash
   cd /docker
   git clone https://TU_TOKEN@github.com/<REPO>.git <PROYECTO>
   cd <PROYECTO> && git checkout <RAMA> && ls
   ```
   > 🔒 El token queda en `.git/config` del proyecto. Es de un repo y read-only → riesgo bajo.

---

## 4. Supabase Cloud → base de datos

1. Crear el proyecto en supabase.com (región cercana al VPS, p.ej. East US). Plan **Pro**
   si es producción 24/7 (el free se **pausa** por inactividad). Compute **MICRO** alcanza.
2. **Connect → tipo URI → usar "Session pooler"**, NO "Direct connection":
   ```
   postgresql://postgres.<ref>:<PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres
   ```
   - ⚠️ **Decisión clave:** el *Direct connection* (`db.<ref>.supabase.co`) es **IPv6-only**;
     los contenedores Docker normalmente solo tienen IPv4 → **no conecta**. El **Session
     pooler** es IPv4 y soporta todo el DDL → es el correcto para migraciones y para la app.
3. Reemplazar `<PASSWORD>` por la contraseña real de la DB (Settings → Database →
   *Reset database password* si no la tenés). **Usá solo letras y números** (los símbolos
   rompen el string de conexión).
4. **Habilitar extensiones** que use el proyecto: Database → Extensions → activar las que
   correspondan (p.ej. `vector` para pgvector, `pgmq` para la cola). Hacerlo **antes** de
   migrar, si no la migración falla a la mitad.

---

## 5. Dominio + DNS (Hostinger)

1. hPanel → **Domains → DNS / Nameservers** del dominio.
2. Un dominio recién registrado apunta al **parking de Hostinger** (IP tipo `2.57.x.x`).
   Hay que reapuntarlo al VPS. Dejá estos 3 registros **A** → `<IP_VPS>`:

   | Tipo | Nombre | Valor | TTL |
   |---|---|---|---|
   | A | `@` | `<IP_VPS>` | 300 |
   | A | `www` | `<IP_VPS>` | 300 |
   | A | `api` | `<IP_VPS>` | 300 |

   - **Editá** el `@` que apunta al parking (no dejes dos `@`). **Agregá** `api` (no existe).
   - TTL mínimo en Hostinger = **60** (no menos). 300 propaga rápido.
3. Verificar desde el VPS (debe dar `<IP_VPS>`):
   ```bash
   getent hosts <DOMINIO> api.<DOMINIO>
   ```
   Propaga en minutos a un par de horas.

---

## 6. Variables de entorno (en el VPS)

```bash
cd /docker/<PROYECTO>
# (1) generar secretos:
echo "JWT_SECRET = $(openssl rand -hex 32)"
echo "WAHA_API_KEY = $(openssl rand -hex 24)"   # si el proyecto usa WAHA

# (2) .env raíz (substitución del compose: DOMAIN, claves de build):
cp .env.prod.example .env && nano .env          # DOMAIN=<DOMINIO>, etc.

# (3) backend/.env (DATABASE_URL de Supabase, JWT_SECRET, FRONTEND_URL=https://<DOMINIO>, …):
cp backend/.env.prod.example backend/.env && nano backend/.env
```
- nano: mover con flechas, guardar **Ctrl+O → Enter**, salir **Ctrl+X**. Pegar = **Ctrl+Shift+V**.
- ⚠️ **Limpiar comentarios inline** de los `.env` (las plantillas traen notas `# …` que, si
  quedan pegadas al valor, lo ensucian y rompen cosas en silencio):
  ```bash
  sed -i -E 's/[[:space:]]+#.*$//' backend/.env .env
  ```

---

## 7. Migraciones + (opcional) datos demo

Sin instalar nada en el VPS: un contenedor `postgres` temporal lee el `DATABASE_URL` del
`.env` y corre los `.sql` contra Supabase.

```bash
cd /docker/<PROYECTO>
# Migraciones (esquema):
docker run --rm --env-file backend/.env -v "$PWD/backend/migrations:/m" postgres:15 \
  bash -c 'for f in /m/*.sql; do echo ">>> $(basename "$f")"; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f" || exit 1; done'

# (Opcional) datos demo, si el repo trae seeds:
docker run --rm --env-file backend/.env -v "$PWD/infra/local-init:/s" postgres:15 \
  bash -c 'for f in /s/0[2-9]_*.sql /s/1[0-9]_*.sql; do echo ">>> $(basename "$f")"; psql "$DATABASE_URL" -f "$f"; done'
```
> Si una migración corta por una extensión faltante → habilitala en Supabase (§4) y reintentá.

---

## 8. Levantar

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml ps
docker logs <PROYECTO>-backend --tail 30     # buscar "startup" + creación de tenant/usuario
```
La 1ª vez compila (varios minutos). Todos los contenedores deben quedar **Up**.

---

## 9. HTTPS / certificado

- Con el DNS ya apuntando al VPS, Traefik emite el cert **solo**.
- Si tras unos minutos el navegador da `ERR_CERT_AUTHORITY_INVALID` / "Not secure" y los
  logs de Traefik no muestran intentos, **forzá un reintento reiniciando Traefik**:
  ```bash
  docker restart traefik          # ⚠️ parpadeo de ~3-5 s en TODOS los sitios del VPS
  ```
- Verificar el emisor del certificado:
  ```bash
  echo | openssl s_client -connect <DOMINIO>:443 -servername <DOMINIO> 2>/dev/null | openssl x509 -noout -issuer
  # OK → "issuer= ... Let's Encrypt ..."   ·   Falta → "TRAEFIK DEFAULT CERT"
  ```
- "rate limited / too many failed authorizations" en los logs → Let's Encrypt te frenó
  (~5 fallos/hora por hostname). Esperar ~1 h; reintenta solo.
- Tras emitirse, en el navegador: **Ctrl+Shift+R** o ventana incógnita (el "Not secure"
  suele ser caché).

---

## 10. Primer login / usuario dueño

- La app crea el usuario dueño en el 1er arranque desde `DEFAULT_LIDER_EMAIL/PASSWORD`.
- Para **cambiar** la contraseña después (editar el `.env` NO actualiza un usuario ya creado),
  reseteala en la base usando el hash de la propia app:
  ```bash
  docker exec -i <PROYECTO>-backend python <<'EOF'
  from app.core.auth import hash_password
  from app.core.config import settings
  import psycopg
  NUEVA = "CambiameYa123"
  with psycopg.connect(settings.database_url) as c, c.cursor() as cur:
      cur.execute("update app_users set password_hash=%s where email=%s",
                  (hash_password(NUEVA), "EMAIL_DEL_USUARIO"))
      c.commit(); print("filas:", cur.rowcount)
  EOF
  ```

---

## 11. Operación

- **Logs:** `docker logs -f <PROYECTO>-backend`
- **Actualizar a la última versión del repo:**
  ```bash
  cd /docker/<PROYECTO> && git pull && docker compose -f docker-compose.prod.yml up -d --build
  ```
- **Swap** (si el VPS no tiene, recomendado como red de seguridad):
  ```bash
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```
- **Capacidad del VPS** (chequear antes de sumar un proyecto):
  ```bash
  free -h; docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"
  ```

---

## 12. Checklist rápido (por proyecto)

- [ ] Repo con `docker-compose.prod.yml` + `.env.prod.example` (parametrizados por `${DOMAIN}`)
- [ ] (Privado) token de GitHub para clonar
- [ ] Proyecto Supabase + **Session pooler** string + extensiones habilitadas
- [ ] Dominio con 3 registros A (`@`, `www`, `api`) → IP del VPS
- [ ] `.env` cargados y **comentarios inline limpiados**
- [ ] Migraciones aplicadas (+ seeds si aplica)
- [ ] `docker compose up -d --build` → contenedores Up
- [ ] Certificado Let's Encrypt emitido (restart Traefik si hace falta)
- [ ] Login OK
