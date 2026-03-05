# Caché y errores unificados (HELPDEX)

## Caché

Toda la caché del backend usa la configuración central en **`config/helpdex_cache.php`**:

- **Claves**: prefijo `helpdex_` y nombres por recurso (tickets AutoTask, resources map, sites Datto, devices Datto).
- **TTL**: `AUTOTASK_CACHE_TTL` (por defecto 60 s) para AutoTask; `DATTO_RMM_CACHE_TTL` (por defecto 300 s) para Datto RMM.

En **`.env`**:

- **`CACHE_STORE`**: `file` (por defecto, persiste en `storage/framework/cache/data`) o `array` (solo en memoria, no escribe en disco).
- En Windows/OneDrive, si `php artisan helpdex:refresh-cache` falla por permisos, usa `CACHE_STORE=array` en desarrollo.

Comando:

```bash
php artisan helpdex:refresh-cache
```

Limpia toda la caché. Si falla, el comando sugiere usar `CACHE_STORE=array`.

## Errores API

Las respuestas de error de la API pueden incluir:

- **`message`**: mensaje corto para el usuario.
- **`hint`** (opcional): indicación para el administrador (ej. revisar .env).
- **`source`** (opcional): `autotask`, `datto` o `backend`.

El frontend puede mostrar `message` y, si existe, `hint` en el `ModuleErrorBanner` o en avisos por módulo. El helper **`App\Support\ApiErrorResponse`** sirve para devolver respuestas con este formato desde controladores o servicios.
