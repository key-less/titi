# Frontend HELPDEX (React + Vite)

UI del gestor de tareas para ingenieros de soporte. Sigue la línea visual del mockup (HELPDEX, Syne, JetBrains Mono, tema oscuro).

## Cómo ejecutar

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Estructura

- `src/app/` — App, rutas, estilos globales.
- `src/features/` — Módulos por dominio:
  - `dashboard/` — Dashboard operacional (métricas, gráficos, tickets recientes, parches).
  - (futuro) `tickets/`, `patches/`, `ai-assistant/`, `auth/`.
- `src/shared/` — Componentes y utilidades reutilizables (crear según necesidad).

Los datos del dashboard son mock; al conectar el backend (Laravel), se sustituirán por llamadas a la API. Ver **ARCHITECTURE.md** en la raíz.
