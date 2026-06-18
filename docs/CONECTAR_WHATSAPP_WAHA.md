# Conectar un número de WhatsApp a WAHA (vincular dispositivo)

Procedimiento **reutilizable** para vincular el **número observador** (el descartable)
a la sesión de WAHA en producción, para que empiece a capturar grupos. Probado
2026-06-12. Sirve para mentorcomercial y cualquier proyecto con WAHA.

> ⚠️ **Orden importante:** el celular tiene que tener **WhatsApp YA registrado** (con su
> número + código SMS) **antes** de escanear el QR. El QR vincula un *dispositivo
> secundario* a una cuenta existente — no crea la cuenta. Si no sabés el número del chip:
> llamá a otro teléfono desde él y miralo en el identificador de llamadas.

## Por qué NO usamos el dashboard de WAHA

El panel `http://<waha>/dashboard` pide usuario/password y los defaults (`waha`/`waha`)
no siempre funcionan. **Lo evitamos**: sacamos el QR como **imagen** vía la API + un
**túnel SSH**, sin depender del dashboard.

## Datos que necesitás

```bash
# En el VPS — IP interna del contenedor WAHA y la API key:
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mc-waha
grep -E '^WAHA_API_KEY=' /docker/<PROYECTO>/.env      # copiar el valor después del '='
```
> El `grep` va **anclado a `^`** para no agarrar la línea de comentario que también
> contiene "WAHA_API_KEY".

## Pasos

**1. Túnel SSH** — en **PowerShell de tu PC** (no la terminal del VPS). Reemplazá la IP
del contenedor y la del VPS:
```powershell
ssh -L 4500:<IP_CONTENEDOR_WAHA>:3000 root@<IP_VPS>
```
Dejá esa ventana abierta (es el túnel; `localhost:4500` ahora llega a WAHA).

**2. Dejá la cámara lista en el celular observador:**
WhatsApp → **Ajustes → Dispositivos vinculados → Vincular un dispositivo** (abre la cámara).

**3. En OTRA ventana de PowerShell** — bajá un QR fresco y abrilo
(⚠️ la key **entre comillas**, si no PowerShell la toma como comando):
```powershell
$KEY = "<API_KEY_49_CHARS>"
curl.exe -s -X POST "http://localhost:4500/api/sessions/default/stop"  -H "X-Api-Key: $KEY"
Start-Sleep 2
curl.exe -s -X POST "http://localhost:4500/api/sessions/default/start" -H "X-Api-Key: $KEY"
Start-Sleep 5
curl.exe -s "http://localhost:4500/api/default/auth/qr?format=image" -H "X-Api-Key: $KEY" -o "$env:USERPROFILE\Desktop\qr.png"
Invoke-Item "$env:USERPROFILE\Desktop\qr.png"
```
> Usar **`curl.exe`** (no `Invoke-WebRequest`, que tira `NullReferenceException` en
> PowerShell 5.1 con binarios).

**4. Escaneá** el `qr.png` (en la pantalla de la PC) con la cámara del celular.
- El QR **vence en ~30-60 s**. Si se vence, repetí **solo las 2 últimas líneas** (bajar +
  abrir) para uno nuevo y escaneá rápido.
- Si `qr.png` "no es una imagen válida" → la sesión no estaba en `SCAN_QR_CODE`
  (suele ser key vacía → 401, o falta el stop/start). Revisá que la key esté entre comillas.

**5. Verificá que quedó vinculado:**
```powershell
curl.exe -s "http://localhost:4500/api/sessions/default" -H "X-Api-Key: $KEY"
```
- `"status":"WORKING"` → ✅ conectado.
- `"me":{"id":"549XXXXXXXXXX@c.us",...}` → **ese es el número** del observador (antes de `@c.us`).

## Después de vincular

1. **Meter el número observador a los grupos** a observar (que un admin lo agregue, o
   unirse por link). Empezar con **pocos** grupos (riesgo de baneo si es un número nuevo
   con mucha actividad de golpe).
2. Mandar un mensaje de prueba en un grupo → debe aparecer en **/mensajes** del panel en
   segundos.
3. La sesión sobrevive reinicios (volumen `waha_sessions`). **Backupear ese volumen**
   para no re-escanear el QR.

## Gotchas (resumen)

- Celular **con WhatsApp ya registrado** antes del QR.
- `$KEY` **entre comillas** en PowerShell.
- `grep '^WAHA_API_KEY='` anclado (no agarrar el comentario).
- **`curl.exe`**, no `Invoke-WebRequest`.
- El QR **vence rápido** → cámara lista primero, bajar QR después.
- Dashboard de WAHA evitado (auth molesta) → método imagen + túnel.
- La **IP interna del contenedor** puede cambiar al recrear WAHA → re-chequear con `docker inspect`.
