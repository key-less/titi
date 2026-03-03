# Backend HELPDEX (Laravel)

API REST con Clean Architecture. **El proyecto Laravel ya está creado** en esta carpeta. **Fase 1:** integración AutoTask (tickets), cuenta/contacto/técnico, sugerencias IA y chat.

## Después de clonar el repositorio

En una máquina nueva, tras `git clone`:

1. **Instalar dependencias:** `composer install` (no se versiona `vendor/`).
2. **Crear `.env`:** `copy .env.example .env` y `php artisan key:generate`.
3. **Opcional — limpiar caché** si vienes de otro equipo o ves errores raros:

   ```bash
   php artisan route:clear
   php artisan config:clear
   php artisan cache:clear
   ```

4. Seguir los pasos de **Cómo iniciar** más abajo.

## Requisitos

- **PHP 8.2+**
- **Composer** ([getcomposer.org](https://getcomposer.org))

## Usar con Laravel Herd

Si usas [Laravel Herd](https://herd.laravel.com) en Windows, no hace falta `php artisan serve`: Herd sirve el backend con Nginx y PHP.

1. **Enlazar el backend como sitio** (desde la raíz del repo):

   ```powershell
   cd backend
   herd link helpdex
   ```

   La API quedará en [http://helpdex.test](http://helpdex.test) (o el nombre que pongas en `herd link <nombre>`).

2. **Configurar `.env`:**
   - `APP_URL=http://helpdex.test` (o la URL que te dé Herd).
   - El resto igual: AutoTask, OpenAI, etc.

3. **Frontend (Vite):** para que el proxy apunte al backend de Herd, en la carpeta `frontend` crea un `.env` con:

   ```env
   VITE_BACKEND_URL=http://helpdex.test
   ```

   Reinicia `npm run dev` para que Vite use la nueva URL. Sin este paso, el proxy sigue apuntando a [http://127.0.0.1:8000](http://127.0.0.1:8000).

4. **Comandos útiles:** `herd open` (abre el sitio en el navegador), `herd edit` (abre en el IDE). La extensión **zip** y Composer vienen con Herd, así que `composer install` debería funcionar sin tocar `php.ini`.

## Cómo iniciar

### 1. Instalar dependencias

```bash
cd backend
composer install
```

### 2. Configurar entorno

```bash
copy .env.example .env
php artisan key:generate
```

Edita `.env` y rellena:

- **Laravel:** `APP_NAME`, `APP_URL` (opcional). Opcional: `CACHE_STORE=file` (por defecto) o `array` para no persistir caché.
- **AutoTask:** `AUTOTASK_ZONE_URL`, `AUTOTASK_USERNAME`, `AUTOTASK_SECRET`, `AUTOTASK_INTEGRATION_CODE`.
- **Datto RMM:** `DATTO_RMM_API_URL` (ej. [https://vidal-api.centrastage.net](https://vidal-api.centrastage.net)), `DATTO_RMM_API_KEY`, `DATTO_RMM_API_SECRET`. Opcional: `DATTO_RMM_VERIFY_SSL=false` si en Windows falla cURL 60 (SSL). Necesario para Parches, Dispositivos y datos RMM en Reportes.
- **IA:** `OPENAI_API_KEY` (para sugerencias y chat).

### 3. Ejecutar el servidor

```bash
php artisan serve
```

La API quedará en [http://localhost:8000](http://localhost:8000). El frontend (Vite) tiene proxy a `/api` → [http://localhost:8000](http://localhost:8000), así que al levantar el backend el dashboard cargará los tickets reales de AutoTask (si las credenciales están configuradas).

### 4. Probar la API

- **Raíz:** [http://localhost:8000](http://localhost:8000) → JSON con nombre de la app y rutas.
- **Ping (texto plano):** [http://127.0.0.1:8000/ping](http://127.0.0.1:8000/ping) y [http://127.0.0.1:8000/api/ping](http://127.0.0.1:8000/api/ping) → deberías ver "HELPDEX OK" / "HELPDEX API OK".
- **Estado AutoTask:** [http://127.0.0.1:8000/api/tickets/status](http://127.0.0.1:8000/api/tickets/status) → JSON con configuración.
- **Health:** [http://localhost:8000/up](http://localhost:8000/up)
- **Tickets:** GET [http://localhost:8000/api/tickets](http://localhost:8000/api/tickets)

**Si ves página en blanco** al abrir esas URLs en el navegador:

1. Limpia caché y reinicia el servidor desde la carpeta `backend`:

   ```bash
   cd backend
   php artisan route:clear
   php artisan config:clear
   php artisan cache:clear
   php artisan serve --host=127.0.0.1
   ```

2. Prueba primero [http://127.0.0.1:8000/ping](http://127.0.0.1:8000/ping) (ruta web, texto plano). Si ahí tampoco ves nada, prueba desde PowerShell: `Invoke-WebRequest -Uri http://127.0.0.1:8000/ping -UseBasicParsing | Select-Object -ExpandProperty Content`
3. Si usas extensión "Pretty-print" o similar para JSON, desactívala o prueba en ventana de incógnito.

## Caché y limpieza (Datto RMM / Windows)

- **CACHE_STORE:** Por defecto Laravel usa `file` (`.env`: `CACHE_STORE=file`). La caché de Datto RMM (sites, dispositivos, token OAuth) y la de reportes se guardan ahí. Si en desarrollo quieres evitar disco, puedes usar `CACHE_STORE=array` (no persiste entre peticiones).
- **Si `php artisan cache:clear` falla con permisos** (por ejemplo en Windows con carpeta en OneDrive): ejecuta la terminal como Administrador o borra manualmente el contenido de `storage/framework/cache/data` (por ejemplo con PowerShell: `Remove-Item -Path storage\framework\cache\data\* -Recurse -Force` desde la carpeta `backend`). Cerrar el servidor PHP antes de borrar evita bloqueos.
- **Solo limpiar caché de Datto RMM:** Las claves son `datto_rmm_sites`, `datto_rmm_devices_*`, `datto_rmm_devices_sites_summary_*`, `datto_rmm_devices_list_*` y `datto_rmm_access_token`. Puedes usar `php artisan tinker` y ejecutar `Cache::forget('datto_rmm_sites'); Cache::forget('datto_rmm_access_token');` y, si necesitas, limpiar las de devices (las claves con sufijo dependen del site). O bien ejecutar `php artisan cache:clear` si los permisos lo permiten.
- **Refresco automático cada 5 minutos:** El comando `php artisan helpdex:refresh-cache` limpia toda la caché (AutoTask + Datto RMM) para que los datos carguen más rápido en la siguiente petición. Está programado para ejecutarse cada 5 minutos. Para que funcione en el servidor, añade al crontab: `* * * * * cd /ruta/al/backend && php artisan schedule:run >> /dev/null 2>&1`. Para ejecutarlo a mano: `php artisan helpdex:refresh-cache`.

## Endpoints Fase 1

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | /api/tickets | Lista de tickets (AutoTask). Query: `status[]`, `limit`, `open_only`, `period`, `assigned_resource_id`. Si `AUTOTASK_QUEUE_IDS` está definido, solo se muestran tickets de esas colas (Level I, Level II, etc.). |
| GET | /api/tickets/{id} | Ticket con cuenta, contacto, técnicos y sugerencias IA |
| GET | /api/tickets/status | Estado de configuración AutoTask (diagnóstico) |
| GET | /api/tickets/zone-info?username=... | Obtiene la URL de zona correcta para tu cuenta (útil si hay 401) |
| GET | /api/patches/sites | Lista de sites de Datto RMM (para filtros). Cache 5 min. |
| GET | /api/patches | Dispositivos con estado de parches. Query: `site_uid` (opcional). Devuelve `devices`, `summary` por categoría, `summaryLabels`, `patches` (legacy Workstations/Servers), `lastUpdated`. Cache 5 min. Requiere DATTO_RMM_* en .env. |
| GET | /api/devices/sites-summary | Resumen por site: total, workstation, network, esxi, printer, grupos. Query: `site_uid` (opcional). Cache 5 min. |
| GET | /api/devices | Lista de dispositivos. Query: `site_uid` (opcional). Incluye `portalUrl` por dispositivo. |
| GET | /api/devices/{deviceUid} | Detalle de un dispositivo (SO, último usuario, IP, hardware, portalUrl). |
| GET | /api/devices/{deviceUid}/alerts | Alertas del dispositivo. Query: `open=false` para resueltas. |
| GET | /api/reports/summary | Reporte agregado: tickets por estado, dispositivos por site/tipo, parches por categoría. Query: `period=24h`, `7d` o `6m`. |
| POST | /api/ai/chat | Chat con asistente IA. Body: `{ "message": "...", "ticketContext": "opcional" }` |

## Estatus de tickets soportados

In Progress, Complete, Waiting Customer, Waiting Vendor, Work Complete, New, etc. El mapeo desde los IDs de AutoTask se configura en `config/autotask.php` → `status_labels`. El frontend permite filtrar por estado (dropdown "Estado"). **Dashboard / open_only=1:** la API solo pide a AutoTask tickets con status en `open_status_ids` (por defecto: New 1, In Progress 6, Waiting Customer 9, Waiting Vendor 10), no se traen completados.

## Filtrar por colas (Level I, Level II, Monitoring Alerts)

Para ver solo tickets de ciertas colas: en `.env` define `AUTOTASK_QUEUE_IDS=123,456,789` (IDs de tus colas en AutoTask: **Admin > Service Desk > Queues**). Opcionalmente edita `config/autotask.php` → `queue_labels` para mostrar el nombre de cada cola en la UI (ej. `123 => 'Level I Support'`).

## Estructura (resumen)

- `app/Domain` — Entidades (Ticket, Account, Contact, Resource) y enum TicketStatus.
- `app/Application` — Casos de uso e interfaces (ListMyTickets, GetTicketWithSuggestions, ChatWithAssistant).
- `app/Infrastructure` — AutoTaskApiClient, AutoTaskTicketRepository, OpenAISuggestionsService.
- `app/Http/Controllers/Api` — TicketController, AiAssistantController.
- `bootstrap/app.php` — Rutas web, **api** y comandos registrados.
- `bootstrap/providers.php` — AppServiceProvider y HelpdexServiceProvider.
