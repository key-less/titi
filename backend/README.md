# Backend HELPDEX (Laravel)

API REST con Clean Architecture. **El proyecto Laravel ya está creado** en esta carpeta. **Fase 1:** integración AutoTask (tickets), cuenta/contacto/técnico, sugerencias IA y chat.

## Requisitos

- **PHP 8.2+**
- **Composer** ([getcomposer.org](https://getcomposer.org))

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
| GET | /api/tickets | Lista de tickets (AutoTask). Query: `status[]`, `limit` |
| GET | /api/tickets/{id} | Ticket con cuenta, contacto, técnicos y sugerencias IA |
| POST | /api/ai/chat | Chat con asistente IA. Body: `{ "message": "...", "ticketContext": "opcional" }` |

## Estatus de tickets soportados

In Progress, Complete, Waiting Customer, Waiting Vendor, Work Complete. El mapeo desde los IDs de AutoTask se configura en `config/autotask.php` → `status_labels`.

## Estructura (resumen)

- `app/Domain` — Entidades (Ticket, Account, Contact, Resource) y enum TicketStatus.
- `app/Application` — Casos de uso e interfaces (ListMyTickets, GetTicketWithSuggestions, ChatWithAssistant).
- `app/Infrastructure` — AutoTaskApiClient, AutoTaskTicketRepository, OpenAISuggestionsService.
- `app/Http/Controllers/Api` — TicketController, AiAssistantController.
- `bootstrap/app.php` — Rutas web, **api** y comandos registrados.
- `bootstrap/providers.php` — AppServiceProvider y HelpdexServiceProvider.
