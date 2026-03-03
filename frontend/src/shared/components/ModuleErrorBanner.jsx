/**
 * Banner de error por módulo: mensaje claro y hint según el origen (AutoTask, Datto RMM, backend).
 */
export function ModuleErrorBanner({ error, apiMessage, module = 'default', onRetry, retryLabel = 'Actualizar' }) {
  const hints = {
    tickets: 'Revisa AUTOTASK_* en .env y que el backend esté en marcha. Si acabas de cambiar .env, ejecuta php artisan config:clear y reinicia el servidor.',
    patches: 'Usa el botón Actualizar para reintentar. Si persiste, revisa DATTO_RMM_API_URL, DATTO_RMM_API_KEY y DATTO_RMM_API_SECRET en .env; en Windows puede ser necesario DATTO_RMM_VERIFY_SSL=false.',
    devices: 'Usa el botón Actualizar para reintentar. Si persiste, revisa la configuración de Datto RMM en .env (DATTO_RMM_*) y que el backend esté en marcha.',
    reports: 'Revisa que el backend esté en marcha y las variables de .env (AutoTask para tickets; Datto RMM para dispositivos y parches).',
    default: 'Revisa que el backend esté en marcha (php artisan serve) y la configuración en .env. Usa Actualizar para reintentar.',
  };
  const hint = hints[module] ?? hints.default;

  if (!error && !apiMessage) return null;

  if (apiMessage && !error) {
    return (
      <div style={{ padding: '12px 16px', background: 'rgba(234,179,8,0.12)', borderRadius: 6, marginBottom: 16, fontFamily: 'monospace', fontSize: 12, color: '#eab308' }}>
        {apiMessage}
        {onRetry && (
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={onRetry} style={{ background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)', color: '#eab308', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11 }}>{retryLabel}</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.12)', borderRadius: 6, marginBottom: 16, fontFamily: 'monospace', fontSize: 12, color: '#ef4444' }}>
      <div style={{ fontWeight: 600 }}>{error}</div>
      <div style={{ marginTop: 6, fontSize: 11, color: '#f87171', opacity: 0.95 }}>{hint}</div>
      {onRetry && (
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={onRetry} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11 }}>{retryLabel}</button>
        </div>
      )}
    </div>
  );
}
