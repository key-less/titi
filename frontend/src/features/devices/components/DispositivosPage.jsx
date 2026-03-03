/**
 * Módulo Dispositivos — Por site: Workstation, Network, ESXi, total, grupos. Detalle con link a RMM.
 */
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDevices } from '../hooks/useDevices';
import { fetchDeviceDetail, fetchDeviceAlerts } from '../api/devicesApi';
import { ModuleErrorBanner } from '../../../shared/components/ModuleErrorBanner';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const NAV_ITEMS = [
  { icon: '▣', label: 'Dashboard', path: '/' },
  { icon: '◈', label: 'Mis Tickets', path: '/mis-tickets' },
  { icon: '◉', label: 'Parches', path: '/parches' },
  { icon: '◎', label: 'Dispositivos', path: '/dispositivos' },
  { icon: '⬡', label: 'IA Asistente', path: '/ia-asistente' },
  { icon: '◇', label: 'Reportes', path: '/reportes' },
];

export function DispositivosPage() {
  const location = useLocation();
  const [siteUid, setSiteUid] = useState('');
  const {
    sitesSummary,
    devices,
    loading,
    error,
    configured,
    apiMessage,
    refetch,
  } = useDevices(siteUid || null);

  const [detailUid, setDetailUid] = useState(null);
  const [detail, setDetail] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!detailUid) {
      setDetail(null);
      setAlerts([]);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    Promise.all([
      fetchDeviceDetail(detailUid),
      fetchDeviceAlerts(detailUid, true),
    ]).then(([detailRes, alertsRes]) => {
      if (cancelled) return;
      setDetail(detailRes.device ? { ...detailRes.device, auditSummary: detailRes.auditSummary } : null);
      setAlerts(alertsRes.alerts ?? []);
    }).catch(() => {
      if (!cancelled) setDetail(null);
    }).finally(() => {
      if (!cancelled) setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [detailUid]);

  const currentSiteSummary = siteUid
    ? sitesSummary.find((s) => s.uid === siteUid)
    : sitesSummary.length ? sitesSummary.reduce((acc, s) => ({
        total: acc.total + s.total,
        workstation: acc.workstation + (s.workstation ?? 0),
        network: acc.network + (s.network ?? 0),
        esxi: acc.esxi + (s.esxi ?? 0),
        printer: acc.printer + (s.printer ?? 0),
        unknown: acc.unknown + (s.unknown ?? 0),
        groupsCount: acc.groupsCount + (s.groupsCount ?? 0),
        name: 'Todos los sites',
      }), { total: 0, workstation: 0, network: 0, esxi: 0, printer: 0, unknown: 0, groupsCount: 0 }) : null;

  return (
    <>
      <style>{`
        .helpdex-card { background: #0a1628; border: 1px solid #1a2744; border-radius: 10px; animation: slideIn 0.4s ease forwards; }
        .helpdex-card:hover { border-color: #0e4d91; transition: border-color 0.2s; }
        .helpdex-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #475569; }
        .section-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #1e4976; padding-bottom: 12px; border-bottom: 1px solid #0f1e35; margin-bottom: 16px; }
        .nav-item { padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; color: #475569; transition: all 0.15s; display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
        .nav-item:hover { background: #0d1d36; color: #94a3b8; }
        .nav-item.active { background: #0e2a4d; color: #38bdf8; border-left: 2px solid #0ea5e9; }
        .grid-bg { background-image: linear-gradient(rgba(14,77,145,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,77,145,0.05) 1px, transparent 1px); background-size: 32px 32px; }
        .device-row { cursor: pointer; transition: background 0.15s; }
        .device-row:hover { background: rgba(14,165,233,0.08); }
        @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <aside style={{ width: 220, background: '#06101e', borderRight: '1px solid #0f1e35', display: 'flex', flexDirection: 'column', padding: '24px 12px', gap: 4, position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
          <div style={{ padding: '0 8px 28px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#0ea5e9', letterSpacing: 1 }}>HELPDEX</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#1e3a5f', letterSpacing: 2, marginTop: 2 }}>OPERATIONS CENTER</div>
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = item.path ? (location.pathname === item.path || (item.path === '/' && (location.pathname === '/' || location.pathname === '/dashboard'))) : false;
            const content = <><span style={{ fontSize: 14, opacity: 0.7 }}>{item.icon}</span>{item.label}</>;
            return item.path ? (
              <Link key={item.label} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>{content}</Link>
            ) : (
              <div key={item.label} className="nav-item" style={{ opacity: 0.6, cursor: 'not-allowed' }} title="Próximamente">{content}</div>
            );
          })}
          <div style={{ flex: 1 }} />
          <div style={{ borderTop: '1px solid #0f1e35', paddingTop: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff', fontFamily: 'monospace' }}>AR</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Tech L2</div>
                <div style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>AutoTask · Datto</div>
              </div>
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', display: 'flex', gap: 24 }} className="grid-bg">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>Dispositivos — Datto RMM</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                  Site:
                  <select
                    value={siteUid}
                    onChange={(e) => setSiteUid(e.target.value)}
                    disabled={loading}
                    style={{ background: '#0a1628', border: '1px solid #1a2744', color: '#cbd5e1', padding: '6px 12px', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, minWidth: 200 }}
                  >
                    <option value="">Todos los sites</option>
                    {(sitesSummary || []).map((s) => (
                      <option key={s.uid} value={s.uid}>{s.name}</option>
                    ))}
                  </select>
                </label>
                <button onClick={() => refetch()} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                  ↻ ACTUALIZAR
                </button>
              </div>
            </div>

            <ModuleErrorBanner error={error} apiMessage={apiMessage} module="devices" onRetry={refetch} retryLabel="↻ Actualizar" />

            {currentSiteSummary && (
              <div className="helpdex-card" style={{ padding: '22px 24px', marginBottom: 24 }}>
                <div className="section-title">RESUMEN POR TIPO {currentSiteSummary.name ? `— ${currentSiteSummary.name}` : ''}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
                  {[
                    { key: 'workstation', label: 'Workstation', color: '#3b82f6' },
                    { key: 'network', label: 'Network', color: '#8b5cf6' },
                    { key: 'esxi', label: 'ESXi', color: '#06b6d4' },
                    { key: 'printer', label: 'Printer', color: '#64748b' },
                    { key: 'unknown', label: 'Otros', color: '#94a3b8' },
                    { key: 'total', label: 'Total', color: '#0ea5e9' },
                  ].map(({ key, label, color }) => (
                    <div key={key} style={{ background: `${color}18`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color }}>{currentSiteSummary[key] ?? 0}</div>
                      <div className="helpdex-label" style={{ marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                  <div style={{ background: 'rgba(34,197,94,0.12)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{currentSiteSummary.groupsCount ?? 0}</div>
                    <div className="helpdex-label" style={{ marginTop: 4 }}>GRUPOS</div>
                  </div>
                </div>
              </div>
            )}

            <div className="helpdex-card" style={{ padding: '22px 24px' }}>
              <div className="section-title">DISPOSITIVOS</div>
              {loading ? (
                <div style={{ padding: 32, textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>Cargando…</div>
              ) : !configured ? (
                <div style={{ padding: 32, textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>
                  Configura DATTO_RMM en el backend (.env).
                </div>
              ) : devices.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>No hay dispositivos en este site.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 120px 100px 100px', gap: 12, padding: '0 0 10px', borderBottom: '1px solid #0f1e35', marginBottom: 8 }}>
                    {['DISPOSITIVO', 'TIPO', 'SITE', 'ÚLTIMO USUARIO', 'IP', 'ONLINE'].map((h) => (
                      <div key={h} className="helpdex-label">{h}</div>
                    ))}
                  </div>
                  <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                    {devices.map((d) => (
                      <div
                        key={d.uid}
                        className="device-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailUid(d.uid)}
                        onKeyDown={(e) => e.key === 'Enter' && setDetailUid(d.uid)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 100px 90px 120px 100px 100px',
                          gap: 12,
                          padding: '10px 0',
                          alignItems: 'center',
                          borderBottom: '1px solid #0f1e35',
                          fontFamily: 'monospace',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ color: '#cbd5e1', fontWeight: 600 }}>{d.hostname || d.uid || '—'}</div>
                        <div style={{ color: '#64748b' }}>{d.deviceClassLabel || '—'}</div>
                        <div style={{ color: '#64748b' }}>{d.siteName || '—'}</div>
                        <div style={{ color: '#94a3b8', fontSize: 11 }}>{(d.lastLoggedInUser || '—').slice(0, 14)}</div>
                        <div style={{ color: '#475569', fontSize: 11 }}>{d.intIpAddress || d.extIpAddress || '—'}</div>
                        <span style={{ color: d.online ? '#22c55e' : '#64748b' }}>{d.online ? 'Sí' : 'No'}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {detailUid && (
            <div className="helpdex-card" style={{ width: 380, maxWidth: '100%', padding: '20px 22px', alignSelf: 'flex-start', position: 'sticky', top: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="section-title" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>DETALLE</div>
                <button type="button" onClick={() => setDetailUid(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }} aria-label="Cerrar">×</button>
              </div>
              {detailLoading ? (
                <div style={{ padding: 24, textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>Cargando…</div>
              ) : detail ? (
                <>
                  <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 }}>{detail.hostname || detail.uid}</div>
                  <dl style={{ margin: 0, fontFamily: 'monospace', fontSize: 11, display: 'grid', gap: 6 }}>
                    <div><span style={{ color: '#475569' }}>Tipo:</span> <span style={{ color: '#cbd5e1' }}>{detail.deviceClassLabel || detail.deviceClass}</span></div>
                    <div><span style={{ color: '#475569' }}>Site:</span> <span style={{ color: '#cbd5e1' }}>{detail.siteName || '—'}</span></div>
                    <div><span style={{ color: '#475569' }}>SO:</span> <span style={{ color: '#cbd5e1' }}>{(detail.operatingSystem || '—').slice(0, 40)}</span></div>
                    <div><span style={{ color: '#475569' }}>Último usuario:</span> <span style={{ color: '#cbd5e1' }}>{detail.lastLoggedInUser || '—'}</span></div>
                    <div><span style={{ color: '#475569' }}>IP interna:</span> <span style={{ color: '#cbd5e1' }}>{detail.intIpAddress || '—'}</span></div>
                    <div><span style={{ color: '#475569' }}>IP externa:</span> <span style={{ color: '#cbd5e1' }}>{detail.extIpAddress || '—'}</span></div>
                    <div><span style={{ color: '#475569' }}>Dominio:</span> <span style={{ color: '#cbd5e1' }}>{detail.domain || '—'}</span></div>
                    <div><span style={{ color: '#475569' }}>Online:</span> <span style={{ color: detail.online ? '#22c55e' : '#64748b' }}>{detail.online ? 'Sí' : 'No'}</span></div>
                    <div><span style={{ color: '#475569' }}>Última vez visto:</span> <span style={{ color: '#94a3b8' }}>{formatDate(detail.lastSeen)}</span></div>
                  </dl>
                  {detail.auditSummary?.hardware && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #0f1e35' }}>
                      <div className="helpdex-label" style={{ marginBottom: 6 }}>HARDWARE</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>
                        {[detail.auditSummary.hardware.manufacturer, detail.auditSummary.hardware.model].filter(Boolean).join(' · ') || '—'}
                        {detail.auditSummary.hardware.totalPhysicalMemory != null && ` · ${Math.round(detail.auditSummary.hardware.totalPhysicalMemory / 1024 / 1024 / 1024)} GB RAM`}
                        {detail.auditSummary.hardware.totalCpuCores != null && ` · ${detail.auditSummary.hardware.totalCpuCores} núcleos`}
                      </div>
                    </div>
                  )}
                  {alerts.length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #0f1e35' }}>
                      <div className="helpdex-label" style={{ marginBottom: 6 }}>ALERTAS ABIERTAS ({alerts.length})</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontFamily: 'monospace', fontSize: 10, color: '#f97316', lineHeight: 1.6 }}>
                        {alerts.slice(0, 5).map((a, i) => (
                          <li key={a.alertUid || i}>{a.diagnostics || a.priority || 'Alerta'}</li>
                        ))}
                        {alerts.length > 5 && <li>+{alerts.length - 5} más</li>}
                      </ul>
                    </div>
                  )}
                  {detail.portalUrl && (
                    <div style={{ marginTop: 16 }}>
                      <a
                        href={detail.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', background: '#0ea5e9', color: '#fff', padding: '10px 18px', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
                      >
                        Ver en RMM →
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>No se pudo cargar el detalle.</div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
