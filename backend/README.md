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
   La API quedará en **http://helpdex.test** (o el nombre que pongas en `herd link <nombre>`).

2. **Configurar `.env`:**
   - `APP_URL=http://helpdex.test` (o la URL que te dé Herd).
   - El resto igual: AutoTask, OpenAI, etc.

3. **Frontend (Vite):** para que el proxy apunte al backend de Herd, en la carpeta `frontend` crea un `.env` con:
   ```
   VITE_BACKEND_URL=http://helpdex.test
   ```
   Reinicia `npm run dev` para que Vite use la nueva URL. Sin este paso, el proxy sigue apuntando a `http://127.0.0.1:8000`.

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

- **Laravel:** `APP_NAME`, `APP_URL` (opcional).
- **AutoTask:** `AUTOTASK_ZONE_URL`, `AUTOTASK_USERNAME`, `AUTOTASK_SECRET`, `AUTOTASK_INTEGRATION_CODE`.
- **IA:** `OPENAI_API_KEY` (para sugerencias y chat).

### 3. Ejecutar el servidor

```bash
php artisan serve
```

La API quedará en **http://localhost:8000**. El frontend (Vite) tiene proxy a `/api` → `http://localhost:8000`, así que al levantar el backend el dashboard cargará los tickets reales de AutoTask (si las credenciales están configuradas).

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
2. Prueba primero **http://127.0.0.1:8000/ping** (ruta web, texto plano). Si ahí tampoco ves nada, prueba desde PowerShell: `Invoke-WebRequest -Uri http://127.0.0.1:8000/ping -UseBasicParsing | Select-Object -ExpandProperty Content`
3. Si usas extensión "Pretty-print" o similar para JSON, desactívala o prueba en ventana de incógnito.

## Endpoints Fase 1

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/tickets | Lista de tickets (AutoTask). Query: `status[]`, `limit`, `open_only`, `period`, `assigned_resource_id`. Si `AUTOTASK_QUEUE_IDS` está definido, solo se muestran tickets de esas colas (Level I, Level II, etc.). |
| GET | /api/tickets/{id} | Ticket con cuenta, contacto, técnicos y sugerencias IA |
| GET | /api/tickets/status | Estado de configuración AutoTask (diagnóstico) |
| GET | /api/tickets/zone-info?username=... | Obtiene la URL de zona correcta para tu cuenta (útil si hay 401) |
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
