# Esquema de base de datos HELPDEX (PostgreSQL)

Base de datos para soportar **login con referencia a Resources de AutoTask**. Los tickets siguen viviendo en AutoTask; esta BD almacena usuarios, caché de resources y enlaces ticket ↔ resource.

---

## Diagrama de tablas

<!-- markdownlint-disable MD040 -->

```
┌─────────────────────────────────────────────────────────────────────────┐
│ autotask_resources                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ id (PK, bigserial)                                                      │
│ autotask_id (unique, not null)  ← ID del Resource en AutoTask           │
│ first_name, last_name, middle_name                                      │
│ email, user_name                                                        │
│ office_phone, office_extension, mobile_phone, home_phone                 │
│ title, initials                                                         │
│ is_active, user_type, location_id, hire_date, internal_cost, resource_type│
│ raw_json (jsonb)          ← Resto de campos de la API                  │
│ synced_at, created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ 1:1 (autotask_resource_id → autotask_id)
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ helpdex_users                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│ id (PK, bigserial)                                                      │
│ autotask_resource_id (unique, FK → autotask_resources.autotask_id)     │
│ name, email                                                             │
│ password (nullable hasta implementar login)                             │
│ remember_token, created_at, updated_at                                   │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│ ticket_assignments                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ id (PK, bigserial)                                                      │
│ ticket_id (not null)              ← ID del ticket en AutoTask            │
│ assigned_resource_autotask_id (not null)  ← ID del Resource en AutoTask │
│ synced_at, created_at, updated_at                                       │
│ UNIQUE(ticket_id, assigned_resource_autotask_id)                         │
│ INDEX(assigned_resource_autotask_id)  ← para "tickets de este resource"  │
└─────────────────────────────────────────────────────────────────────────┘
```

<!-- markdownlint-enable MD040 -->

---

## Descripción de tablas

### `autotask_resources`

Caché local de la entidad **Resource** de AutoTask. Almacena todos los datos posibles devueltos por la API para no perder información.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| `id` | bigserial | PK interno |
| `autotask_id` | bigint | ID del Resource en AutoTask (único) |
| `first_name`, `last_name`, `middle_name` | string | Nombre |
| `email` | string | Correo |
| `user_name` | string | Username (Security tab) |
| `office_phone`, `office_extension` | string | Teléfono y extensión de oficina |
| `mobile_phone`, `home_phone` | string | Móvil y casa |
| `title` | string | Puesto / job title |
| `initials` | string | Iniciales |
| `is_active` | boolean | Activo en AutoTask |
| `user_type` | int | Nivel de seguridad / tipo de licencia |
| `location_id` | int | Ubicación interna |
| `hire_date` | date | Fecha de contratación |
| `internal_cost`, `resource_type` | mixed | Campos HR |
| `raw_json` | jsonb | Resto de campos de la API (flexible) |
| `synced_at` | timestamp | Última sincronización desde AutoTask |

### `helpdex_users`

Usuarios de HELPDEX para **login (futuro)**. Cada fila corresponde a un Resource de AutoTask autorizado a usar la app.

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| `id` | bigserial | PK |
| `autotask_resource_id` | bigint | FK a `autotask_resources.autotask_id` |
| `name` | string | Nombre para mostrar |
| `email` | string | Email (puede coincidir con el resource) |
| `password` | string | Hash; nullable hasta implementar login |
| `remember_token` | string | Para "recordarme" |
| `created_at`, `updated_at` | timestamp | |

### `ticket_assignments`

Enlace entre **ticket (AutoTask)** y **resource asignado**. Permite consultar “tickets asignados al resource X” sin depender solo de la API en cada petición (útil cuando se implemente login por resource).

| Columna | Tipo | Descripción |
| ------- | ---- | ----------- |
| `id` | bigserial | PK |
| `ticket_id` | bigint | ID del ticket en AutoTask |
| `assigned_resource_autotask_id` | bigint | ID del Resource asignado en AutoTask |
| `synced_at` | timestamp | Última sincronización |
| `created_at`, `updated_at` | timestamp | |

- **UNIQUE** (`ticket_id`, `assigned_resource_autotask_id`)
- **INDEX** en `assigned_resource_autotask_id` para filtrar por resource.

---

## Uso previsto

1. **Sincronizar Resources**: job o comando que llame a la API de AutoTask (Resources), rellene o actualice `autotask_resources` y opcionalmente `raw_json`.
2. **Login (futuro)**: al implementar login, el usuario se identificará con un Resource de AutoTask; `helpdex_users` vinculará ese resource con una fila de usuario (y luego con `password`).
3. **Tickets por resource**: al sincronizar tickets (o al abrir la app), se pueden insertar/actualizar filas en `ticket_assignments` para tener en local la relación ticket ↔ resource y filtrar “mis tickets” por `assigned_resource_autotask_id`.

---

## Variables de entorno (PostgreSQL)

En `.env`:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=helpdex
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_contraseña
DB_CHARSET=utf8
# Opcional:
# DB_SSLMODE=prefer
# DB_SCHEMA=public
```

Ejecutar migraciones:

```bash
cd backend
php artisan migrate
```
