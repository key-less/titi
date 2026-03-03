# Dashboard HELPDEX — Referencia del proyecto

El **Dashboard en React es la base e inspiración de todo el proyecto.** Mediante el dashboard se ejecuta y orquesta la experiencia: es la referencia visual, de flujo y de datos. Cualquier nueva pantalla o módulo debe alinearse con este diseño (paleta, tipografía, patrones de layout).

## Origen de los datos

Todo lo que se muestra se rellena **con llamadas a las APIs de AutoTask y Datto RMM.** No hay datos predefinidos. Hasta que cada API esté conectada, las secciones quedan vacías o en cero.

| Bloque | Fuente | Estado |
|--------|--------|--------|
| Tiempo resp. avg, delta vs ayer | AutoTask | Pendiente API |
| Resueltos hoy / esta semana | AutoTask | Pendiente API |
| Tickets abiertos | AutoTask | Conectado |
| SLA Breach | AutoTask | Pendiente API |
| Horas trabajadas (hoy / semana) | AutoTask | Pendiente API |
| Gráfico: Tiempo de respuesta vs SLA | AutoTask | Pendiente API |
| Gráfico: Tickets por semana | AutoTask | Pendiente API |
| Resumen mensual | AutoTask | Pendiente API |
| Estado de parches (Workstations/Servers) | Datto RMM | Módulo habilitado — GET /api/patches; datos vacíos hasta configurar DATTO_RMM_* |
| Tabla de tickets (lista + detalle) | AutoTask | Conectado |

**Nota:** El módulo de parches está habilitado (ruta /parches y sección en dashboard). Los datos se rellenan cuando se configure la API de Datto RMM en el backend.

## Contenido actual del Dashboard

- **Métricas (cards):** Tiempo respuesta avg, Resueltos hoy, Tickets abiertos, SLA Breach, Horas trabajadas.
- **Gráficos:** Tiempo de respuesta vs SLA (30 min); Tickets — semana (resueltos/abiertos).
- **Resumen mensual:** Tickets resueltos, Horas facturadas, SLA cumplido %.
- **Estado de parches:** Workstations / Servers (Compliant, Pendientes, Críticos) — vacío hasta conectar Datto RMM.
- **Tabla de tickets abiertos:** TICKET, Título/Estatus, Prioridad, Estado, Actividad, TECH; fila expandible con detalle, cuenta, contacto, sugerencias IA, botones Ver en AutoTask / Preguntar a IA.

## Por revisar / mejorar / agregar (referencia)

- **Revisar:** Consistencia de prioridades (Normal, Media, Alta, Crítica) y estados entre lista y detalle; manejo de error cuando el backend no está disponible.
- **Mejorar:** Cuando existan endpoints de métricas en el backend, sustituir `EMPTY_METRICS`, `EMPTY_RESPONSE_TIME_DATA`, `EMPTY_WEEKLY_DATA` por estado cargado desde la API; añadir loading/empty states por sección.
- **Agregar:** Endpoints en backend para métricas (resueltos hoy/semana, SLA breach, tiempo respuesta, horas trabajadas) y consumo desde el dashboard; más adelante, integración Datto RMM para parches.

---

## Relación con el `dashboard.jsx` original (raíz del repo)

El archivo **`dashboard.jsx`** en la raíz del repo es el **código completo original**; luego se repartió en rutas, hooks, API y este componente para dejar el proyecto más limpio. Lo que sigue es qué se llevó, qué se cambió y qué podría faltar por recuperar del original.

### Lo que ya está cubierto en el proyecto actual

- **Estilos base:** body, scrollbar, fuentes (Syne, JetBrains Mono), grid-bg, cards, labels, ticket-row, badge, section-title, nav-item, patch-bar, keyframes pulse y slideIn → están en el Dashboard actual y/o en `app/styles/global.css`.
- **Sidebar:** Logo HELPDEX, navegación (Dashboard, Mis Tickets, Parches, Dispositivos, IA Asistente, Reportes), bloque de usuario (Tech L2, AutoTask · Datto). En el proyecto actual además hay `Link` a rutas y estado “Próximamente” para ítems sin ruta.
- **Métricas superiores, gráficos, resumen mensual, estado de parches:** Misma estructura; datos vacíos/cero hasta conectar APIs.
- **Tabla de tickets:** Ahora con datos reales (AutoTask), filtro “Asignado a”, toggle abiertos/historial. Panel expandible con **más** que el original: descripción, cuenta, contacto, sugerencias IA, además de los botones Ver en AutoTask / Preguntar a IA.
- **Footer:** “HELPDEX v0.1.0 · AUTOTASK CONNECTED · …” presente en el Dashboard actual.

### Diferencias intencionadas (evolución)

- **Tabla:** El original mostraba “TICKETS RESUELTOS — ÚLTIMAS 24H” (tickets ya cerrados). El proyecto actual prioriza **TICKETS ABIERTOS** (New, In Progress, Waiting Customer, Waiting Vendor) y opción de ver historial. Es evolución del producto, no pérdida.
- **Columnas:** Original: TÍTULO / CATEGORÍA, RESUELTO, HORAS. Actual: TÍTULO / ESTATUS, ESTADO (última actividad), ACTIVIDAD (horas). Prioridad y estado vienen de AutoTask.

### Posibles piezas del original a tener en cuenta

1. **Categoría de ticket (Network, M365, Server, Security, General)**  
   En el original cada fila tenía un badge de **categoría** bajo el título (`categoryColor`). En el código actual `categoryColor` sigue definido en el Dashboard pero **no se usa** en la tabla porque la API de tickets no envía categoría. **Si AutoTask (u otra fuente) expone tipo/categoría de ticket**, conviene:
   - Exponerla en el backend y en el modelo de ticket.
   - Mostrarla en la tabla (badge bajo el título), usando el `categoryColor` ya definido.

2. **Vista “Tickets resueltos — últimas 24h”**  
   El original era una vista de **resueltos recientes**. Para paridad opcional:
   - Cuando el backend permita filtrar por estado “completado” y por período (ej. últimas 24 h),
   - Se puede añadir un filtro o pestaña “Resueltos hoy / 24h” que llame a ese endpoint y muestre esa tabla (o reutilizar la misma tabla con datos filtrados).

3. **Botón “VER TODOS →”**  
   El original tenía un botón junto al título de la sección. En el proyecto actual el listado completo está en **Mis Tickets** (sidebar). Si se quiere el mismo gesto, se puede añadir un botón “Ver todos →” que navegue a `/mis-tickets`.

4. **Keyframes `scanline` y `shimmer`**  
   En el original están definidos en `<style>` pero no se usan en el JSX. Son candidatos para efectos futuros (loading, estados vacíos). No críticos; se pueden recuperar del `dashboard.jsx` original si se necesitan.

5. **Campo “Resolución” / summary**  
   El original en el panel expandido mostraba un **summary** (texto de resolución). El detalle actual muestra `description` y sugerencias IA. Si AutoTask devuelve un campo de **resolución** cuando el ticket está cerrado, vale la pena mostrarlo en el panel expandido (por ejemplo como “Resolución” cuando exista).

En resumen: nada crucial del original se ha perdido; la base está y se ha ampliado (APIs, filtros, detalle). Lo que puede faltar por “cerrar el círculo” con el original es: **categoría de ticket** (si la API la tiene), **vista de resueltos recientes** (cuando el backend lo permita), y opcionalmente el botón “Ver todos”, los keyframes extra y el campo resolución en el detalle.

Documentación de arquitectura global: `ARCHITECTURE.md` en la raíz del repo.
