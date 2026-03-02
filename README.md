# HELPDEX — Gestor para Ingenieros de Soporte

Sistema personal e interactivo para facilitar el trabajo diario de Help Desk: gestión de tickets (AutoTask), estado de parches (Datto RMM), sugerencias con IA y chat asistente.

## Contenido del repositorio

| Carpeta / archivo | Descripción |
|-------------------|-------------|
| **frontend/** | Aplicación React (Vite): dashboard, futuras vistas de tickets, parches, IA. |
| **backend/** | Estructura para API Laravel con Clean Architecture (Domain, Application, Infrastructure, Presentation). |
| **ARCHITECTURE.md** | Visión, stack, estructura de carpetas y convenciones para mantener coherencia entre chats. |
| **dashboard.jsx** | Mockup original en React; la versión integrada está en `frontend/src/features/dashboard/`. |

## Stack

- **Frontend:** React, Vite, React Router, Recharts.
- **Backend (previsto):** Laravel (PHP), integración AutoTask, Datto RMM, Supabase, servicio de IA.
- **Base de datos / Auth:** Supabase (PostgreSQL).

## Inicio rápido

### Frontend (ya funcional con datos mock)

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

1. Implementar en Laravel los casos de uso y adaptadores (AutoTask, Datto RMM, IA).
2. Sustituir los datos mock del frontend por llamadas al API.
3. Añadir rutas y vistas para Mis Tickets, Parches, IA Asistente (chat) y Reportes.
4. Conectar autenticación con Supabase.
