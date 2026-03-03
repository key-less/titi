# HELPDEX — Gestor para Ingenieros de Soporte

Sistema personal e interactivo para facilitar el trabajo diario de Help Desk: gestión de tickets (AutoTask), estado de parches (Datto RMM), sugerencias con IA y chat asistente.

## Contenido del repositorio

| Carpeta / archivo | Descripción |
|-------------------|-------------|
| **frontend/** | Aplicación React (Vite): dashboard, futuras vistas de tickets, parches, IA. |
| **backend/** | Estructura para API Laravel con Clean Architecture (Domain, Application, Infrastructure, Presentation). |
| **ARCHITECTURE.md** | Visión, stack, estructura de carpetas y convenciones para mantener coherencia entre chats. |
| **frontend/src/features/dashboard/** | **Dashboard React = base e inspiración del proyecto.** Referencia visual y de flujo; desde aquí se orquesta todo. Datos desde AutoTask y Datto RMM (APIs). |

## Stack

- **Frontend:** React, Vite, React Router, Recharts.
- **Backend (previsto):** Laravel (PHP), integración AutoTask, Datto RMM, Supabase, servicio de IA.
- **Base de datos / Auth:** Supabase (PostgreSQL).

## Inicio rápido

### Frontend (dashboard como referencia; tickets desde AutoTask; métricas/gráficos vacíos hasta conectar APIs)

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173

### Backend

1. Crear proyecto Laravel dentro de `backend/` (ver `backend/README.md`).
2. Organizar código según `ARCHITECTURE.md`.
3. Configurar `.env` con claves de AutoTask, Datto RMM, Supabase e IA.

## Variables de entorno (cuando estén en uso)

- **Backend:** `AUTOTASK_*`, `DATTO_RMM_*`, `SUPABASE_URL`, `SUPABASE_KEY`, `OPENAI_API_KEY` (o proveedor de IA).
- **Frontend:** `VITE_API_URL` (URL base del API Laravel).

## Convenciones para futuros desarrollos

- Cualquier cambio que afecte a varios módulos o a la arquitectura debe reflejarse en **ARCHITECTURE.md**.
- Mantener la identidad visual del mockup (HELPDEX, paleta oscura, Syne, JetBrains Mono).
- No commitear secretos; usar siempre variables de entorno.
- Se pueden usar los plugins MCP del proyecto (Supabase, etc.) cuando aplique.

## Próximos pasos sugeridos

1. **Métricas y gráficos en el Dashboard:** Endpoints en Laravel que consuman AutoTask (resueltos hoy/semana, SLA breach, tiempo de respuesta, horas trabajadas) y rellenar las cards y gráficos del dashboard.
2. Mantener el dashboard como referencia: nuevas pantallas y módulos alineados con su estilo (HELPDEX, paleta, Syne, JetBrains Mono).
3. Añadir rutas y vistas para Mis Tickets, IA Asistente (chat) y Reportes según el diseño del dashboard.
4. Conectar autenticación con Supabase.
5. **Parches (Datto RMM):** en espera; prioridad actual son las métricas visuales con AutoTask.
