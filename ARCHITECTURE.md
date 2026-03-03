# HELPDEX — Arquitectura del sistema

> Gestor personal e interactivo para Ingenieros de Soporte: tickets (AutoTask), parches (Datto RMM), sugerencias IA y chat asistente. Help Desk, soporte técnico y troubleshooting.

## Coherencia entre chats

**Este documento es la fuente de verdad del proyecto.** Cualquier cambio que afecte al backend, frontend, integraciones (AutoTask, Datto RMM, Supabase, IA) o estructura de carpetas debe reflejarse aquí (y en el README si aplica), para que los distintos chats mantengan coherencia y no se produzcan fallos al subir o desplegar la aplicación. Al iniciar una tarea nueva, conviene leer este archivo y el README del repo.

---

## 1. Visión y objetivos

- **Listar tickets pendientes** desde AutoTask y **categorizarlos por estatus** de la plataforma.
- **Descripción/resumen del ticket** y **sugerencias de IA** para soluciones rápidas y técnicas acordes al SLA.
- **Chat interactivo con IA** para consultas durante el trabajo.
- **Estado de parches**: Workstation Patches y Server Patches desde Datto RMM (conectado al sistema de tickets).
- **Una sola fuente de verdad** por flujo: AutoTask (tickets), Datto RMM (dispositivos/parches); el gestor orquesta y presenta.

---

## 2. Stack tecnológico

| Capa           | Tecnología     | Uso |
|----------------|----------------|-----|
| **Frontend**   | **React**      | UI del gestor (dashboard, lista de tickets, parches, IA asistente, chat). Se mantiene la línea del mockup existente (`dashboard.jsx`). |
| **Backend API**| **Laravel (PHP)** | API REST, lógica de negocio, integración AutoTask, Datto RMM, orquestación de IA. |
| **Base de datos / Auth** | **Supabase** | PostgreSQL (usuarios, caché de tickets, preferencias, sesiones de chat). Autenticación. Opcional: Realtime. |
| **IA**         | **Laravel + proveedor externo** | Resúmenes de tickets, sugerencias y chat (ej. OpenAI, Claude). Si más adelante se requiere, se puede extraer a un servicio en **Python** o **Go**. |
| **JavaScript** | Incluido en React y tooling (Node, Vite). |

**Nota:** Se prioriza **React** sobre Vue para mantener el mismo código base que el mockup (HELPDEX). Vue, Python y Go quedan como opciones para futuras ampliaciones (microservicios, workers, etc.).

---

## 3. Clean Architecture — Resumen

### 3.1 Backend (Laravel) — Estructura de carpetas

```
backend/
├── app/
│   ├── Domain/                    # Entidades y reglas de negocio puras
│   │   ├── Entities/
│   │   │   ├── Ticket.php
│   │   │   ├── PatchStatus.php
│   │   │   └── ...
│   │   └── Enums/
│   │       ├── TicketStatus.php   # Estatus AutoTask
│   │       └── ...
│   ├── Application/               # Casos de uso (orquestación)
│   │   ├── Tickets/
│   │   │   ├── ListMyTickets.php
│   │   │   ├── GetTicketWithSuggestions.php
│   │   │   └── ...
│   │   ├── Patches/
│   │   │   ├── GetWorkstationPatches.php
│   │   │   └── GetServerPatches.php
│   │   └── AI/
│   │       ├── GetTicketSuggestions.php
│   │       └── ChatWithAssistant.php
│   ├── Infrastructure/            # Adaptadores al mundo externo
│   │   ├── AutoTask/
│   │   │   ├── AutoTaskApiClient.php
│   │   │   └── AutoTaskTicketRepository.php
│   │   ├── DattoRmm/
│   │   │   ├── DattoRmmApiClient.php
│   │   │   └── DattoPatchRepository.php
│   │   ├── Supabase/
│   │   │   └── SupabaseUserRepository.php
│   │   └── AI/
│   │       └── OpenAISuggestionsService.php  # o el proveedor que se use
│   └── Presentation/             # Entrada HTTP (API)
│       └── Http/
│           ├── Controllers/
│           │   ├── TicketController.php
│           │   ├── PatchController.php
│           │   └── AiAssistantController.php
│           └── Middleware/
├── config/
│   ├── autotask.php
│   ├── datto_rmm.php
│   └── services.php
├── routes/
│   └── api.php
└── ...
```

- **Domain:** no depende de Laravel ni de APIs externas; solo entidades y enums (estatus de AutoTask, prioridades, etc.).
- **Application:** casos de uso que usan interfaces (repositorios, servicios IA) definidas en Domain o Application; no conocen AutoTask/Datto/Supabase por nombre.
- **Infrastructure:** implementaciones concretas (clientes AutoTask, Datto RMM, Supabase, IA). Se inyectan en los casos de uso vía contenedor Laravel.
- **Presentation:** controladores que reciben HTTP, llaman a un caso de uso y devuelven JSON.

### 3.2 Frontend (React) — Estructura de carpetas

```
frontend/
├── public/
├── src/
│   ├── app/                  # Configuración global, rutas, providers
│   │   ├── App.jsx
│   │   ├── routes.jsx
│   │   └── providers/
│   ├── features/             # Por dominio/funcionalidad
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   ├── api/
│   │   │   └── hooks/
│   │   ├── tickets/
│   │   │   ├── components/
│   │   │   ├── api/
│   │   │   └── hooks/
│   │   ├── patches/
│   │   ├── ai-assistant/
│   │   │   ├── components/   # Chat, sugerencias por ticket
│   │   │   └── api/
│   │   └── auth/
│   ├── shared/               # Componentes y utilidades reutilizables
│   │   ├── ui/
│   │   ├── api/              # Cliente HTTP base, interceptors
│   │   └── utils/
│   └── main.jsx
├── package.json
└── vite.config.js
```

- El **mockup actual** (`dashboard.jsx`) se toma como referencia visual y de flujo: mismo estilo (HELPDEX, Syne, JetBrains Mono, colores, cards, sidebar, métricas, tabla de tickets, parches, botones “Ver en AutoTask” / “Preguntar a IA”).
- Los datos mock se sustituyen por llamadas al backend; la UI se organiza en `features/` para que cada chat pueda tocar un módulo sin romper otros.

---

## 4. Integraciones externas

- **AutoTask:** API REST para listar tickets del técnico, filtrar por estatus, y (si la API lo permite) actualizar. Los **estatus** se definen en backend según la configuración de AutoTask (ej. New, In Progress, Complete, etc.) y se exponen al frontend para categorizar la lista.
- **Datto RMM:** API para Workstation Patches y Server Patches (compliant, pending, critical). Los datos se pueden cachear en Supabase con TTL corto para no saturar la API.
- **Supabase:** Auth (login/sesión), tablas para usuario, caché de tickets/parches si se desea, historial de chat con la IA.
- **IA:** un solo punto en backend (Laravel): “dame sugerencias para este ticket” y “mensaje de chat”. Laravel llama al proveedor (OpenAI/Claude) y devuelve JSON al frontend.

---

## 5. Fase 1 — Integración AutoTask (implementado)

- **Módulo de tickets** conectado a la API REST de AutoTask (Datto).
- **Estados de ticket:** In Progress, Complete, Waiting Customer, Waiting Vendor, Work Complete (mapeo en `config/autotask.php` → `status_labels`).
- **Sugerencias de IA** por ticket (OpenAI) y **chat** con asistente (`POST /api/ai/chat`), preparado para un futuro Agente de IA.
- **Tickets reales** en el dashboard; se eliminó el mock de tickets.
- **Cuenta (Companies), contacto (Contacts) y técnico (Resources)** asociados al ticket: se obtienen en `GET /api/tickets/{id}` y se muestran en el panel expandido del dashboard.

---

## 6. Flujos principales

1. **Tickets pendientes:** Frontend pide “mis tickets” → Backend usa AutoTask (o caché) → aplica filtros por estatus → devuelve lista categorizada. Frontend muestra la lista al estilo del mockup y permite expandir descripción + sugerencias IA.
2. **Sugerencias por ticket:** Usuario abre un ticket → Frontend pide “sugerencias para ticket X” → Backend construye contexto (título, descripción, categoría) → llama al servicio IA → devuelve sugerencias. Frontend las muestra en el panel expandido o en la vista del ticket.
3. **Chat con IA:** Mensajes enviados desde el frontend → Backend recibe, opcionalmente guarda en Supabase, llama al proveedor IA → devuelve respuesta. El chat puede tener contexto de “ticket actual” si se desea.
4. **Parches:** Frontend pide estado de parches → Backend consulta Datto RMM (o caché) → devuelve Workstation/Server (compliant, pending, critical). Frontend muestra las barras y métricas como en el mockup.

---

## 7. Convenciones para futuros chats

- **Cambios que afecten a más de un módulo** (p. ej. nuevo estatus de AutoTask, nueva pantalla): actualizar este `ARCHITECTURE.md` y, si aplica, el `README.md`.
- **Nuevos endpoints o casos de uso:** mantener la separación Domain / Application / Infrastructure / Presentation; no poner lógica de AutoTask o Datto dentro de controladores.
- **Frontend:** mantener la identidad visual y flujo del mockup (HELPDEX, sidebar, cards, tabla de tickets, parches); nuevos componentes dentro de `features/` correspondiente.
- **Secrets (API keys, AutoTask, Datto, Supabase, IA):** usar variables de entorno; no commitear claves. Documentar en README qué variables se necesitan.
- **Plugins MCP del proyecto:** usar Supabase (y Neon si se añade BD adicional) cuando se necesite base de datos o auth; el backend Laravel puede usar el mismo Postgres de Supabase como cliente SQL.

---

## 8. Dashboard — Centro del proyecto y referencia

**El Dashboard en React es la base e inspiración de todo el proyecto.** Desde el dashboard se ejecuta y orquesta la experiencia: es la referencia visual, de flujo y de datos. Cualquier nueva pantalla o módulo debe sentirse parte del mismo sistema (misma paleta, tipografía y patrones de layout).

### 8.1 Origen de los datos del Dashboard

Todo lo que se muestra (métricas, gráficos, tickets, parches) se rellena **exclusivamente con llamadas a las APIs de AutoTask y Datto RMM**. No hay datos predefinidos; hasta que cada API esté conectada, las secciones correspondientes quedan vacías o en cero.

| Bloque en el Dashboard | Fuente de datos | Estado |
|------------------------|-----------------|--------|
| **Tiempo resp. avg** (y delta vs ayer) | AutoTask (métricas / reportes) | Pendiente API |
| **Resueltos hoy** / **esta semana** | AutoTask (tickets completados por período) | Pendiente API |
| **Tickets abiertos** | AutoTask (lista con `open_only`) | Conectado |
| **SLA Breach** | AutoTask (tickets que exceden SLA) | Pendiente API |
| **Horas trabajadas** (hoy / semana) | AutoTask (time entries o equivalente) | Pendiente API |
| **Gráfico: Tiempo de respuesta vs SLA** | AutoTask (métricas por hora) | Pendiente API |
| **Gráfico: Tickets — semana** (resueltos/abiertos) | AutoTask (agregados por día) | Pendiente API |
| **Resumen mensual** (resueltos, horas facturadas, SLA %) | AutoTask | Pendiente API |
| **Estado de parches** (Workstations / Servers) | Datto RMM | Pendiente — módulo parches en espera |
| **Tabla de tickets abiertos** (filas + detalle expandible) | AutoTask | Conectado |

**Nota:** El módulo de parches (Datto RMM) no se avanza por ahora; queda mucho por hacer en métricas y gráficos con AutoTask antes.

### 8.2 Referencia rápida del diseño (dashboard)

- **Marca:** HELPDEX — OPERATIONS CENTER.
- **Navegación:** Dashboard, Mis Tickets, Parches, Dispositivos, IA Asistente, Reportes.
- **Métricas superiores:** Tiempo respuesta avg, Resueltos hoy, Tickets abiertos, SLA Breach, Horas trabajadas.
- **Gráficos:** Tiempo de respuesta vs SLA (30 min); Tickets por semana (resueltos/abiertos).
- **Parches:** Workstations / Servers — Compliant %, Pendientes %, Críticos; barras apiladas (datos desde Datto RMM cuando se conecte).
- **Tabla de tickets:** ID, Título/Estatus, Prioridad, Estado, Actividad, Tech; fila expandible con descripción, cuenta, contacto, sugerencias IA y botones “Ver en AutoTask” y “Preguntar a IA”.
- **Estilo:** Fondo oscuro (#060b14), cards #0a1628, bordes #1a2744, acentos cyan/azul (#0ea5e9), fuentes Syne + JetBrains Mono.

Cualquier nueva pantalla o flujo debe sentirse parte del mismo sistema (misma paleta, tipografía y patrones de layout).
