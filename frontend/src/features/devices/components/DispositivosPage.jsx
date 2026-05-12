import { useState, useEffect, useMemo } from 'react';
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

const TYPE_LABELS = {
  Workstation: { label: 'Workstation', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  Network: { label: 'Network', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  ESXi: { label: 'ESXi', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  Printer: { label: 'Printer', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

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
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [onlineFilter, setOnlineFilter] = useState('');
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
    if (!detailUid) { setDetail(null); setAlerts([]); return; }
    let cancelled = false;
    setDetailLoading(true);
    Promise.all([fetchDeviceDetail(detailUid), fetchDeviceAlerts(detailUid, true)])
      .then(([detailRes, alertsRes]) => {
        if (cancelled) return;
        setDetail(detailRes.device ? { ...detailRes.device, auditSummary: detailRes.auditSummary } : null);
        setAlerts(alertsRes.alerts ?? []);
      })
      .catch(() => { if (!cancelled) setDetail(null); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailUid]);

  const currentSiteSummary = useMemo(() => {
    if (siteUid) return sitesSummary.find((s) => s.uid === siteUid) ?? null;
    if (!sitesSummary.length) return null;
    return sitesSummary.reduce(
      (acc, s) => ({
        total: acc.total + s.total,
        workstation: acc.workstation + (s.workstation ?? 0),
        network: acc.network + (s.network ?? 0),
        esxi: acc.esxi + (s.esxi ?? 0),
        printer: acc.printer + (s.printer ?? 0),
        unknown: acc.unknown + (s.unknown ?? 0),
        groupsCount: acc.groupsCount + (s.groupsCount ?? 0),
        name: 'Todos los sites',
      }),
      { total: 0, workstation: 0, network: 0, esxi: 0, printer: 0, unknown: 0, groupsCount: 0 }
    );
  }, [siteUid, sitesSummary]);

  const filteredDevices = useMemo(() => {
    let list = devices;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          (d.hostname || '').toLowerCase().includes(q) ||
          (d.siteName || '').toLowerCase().includes(q) ||
          (d.lastLoggedInUser || '').toLowerCase().includes(q) ||
          (d.intIpAddress || '').includes(q)
      );
    }
    if (typeFilter) {
      list = list.filter((d) => (d.deviceClassLabel || 'Workstation') === typeFilter);
    }
    if (onlineFilter === 'online') list = list.filter((d) => d.online);
    if (onlineFilter === 'offline') list = list.filter((d) => !d.online);
    return list;
  }, [devices, search, typeFilter, onlineFilter]);

  const onlineCount = useMemo(() => devices.filter((d) => d.online).length, [devices]);
  const offlineCount = devices.length - onlineCount;

  return (
    <>
      <style>{`
        .helpdex-card { background: #0a1628; border: 1px solid #1a2744; border-radius: 10px; }
        .helpdex-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #475569; }
        .section-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #1e4976; padding-bottom: 12px; border-bottom: 1px solid #0f1e35; margin-bottom: 16px; }
        .nav-item { padding: 8px 12px; border-radius: 6px; font-size: 12px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; color: #475569; transition: all 0.15s; display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-item:hover { background: #0d1d36; color: #94a3b8; }
        .nav-item.active { background: #0e2a4d; color: #38bdf8; border-left: 2px solid #0ea5e9; }
        .grid-bg { background-image: linear-gradient(rgba(14,77,145,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,77,145,0.05) 1px, transparent 1px); background-size: 32px 32px; }
        .device-row { cursor: pointer; transition: background 0.15s; border-bottom: 1px solid #0f1e35; }
        .device-row:hover { background: rgba(14,165,233,0.06); }
        .device-row:last-child { border-bottom: none; }
        .filter-select { background: #0a1628; border: 1px solid #1a2744; color: #cbd5e1; padding: 7px 11px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; cursor: pointer; }
        .filter-select:focus { outline: none; border-color: #0ea5e9; }
        .search-input { background: #0a1628; border: 1px solid #1a2744; color: #cbd5e1; padding: 7px 11px 7px 32px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; width: 200px; }
        .search-input::placeholder { color: #334155; }
        .search-input:focus { outline: none; border-color: #0ea5e9; }
        .stat-card { border-radius: 8px; padding: 12px 14px; text-align: center; transition: transform 0.15s; cursor: pointer; }
        .stat-card:hover { transform: translateY(-1px); }
        .badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; padding: 2px 7px; border-radius: 3px; text-transform: uppercase; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: slideIn 0.35s ease forwards; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside style={{ width: 220, background: '#06101e', borderRight: '1px solid #0f1e35', display: 'flex', flexDirection: 'column', padding: '24px 12px', gap: 4, position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
          <div style={{ padding: '0 8px 28px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#0ea5e9', letterSpacing: 1 }}>HELPDEX</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#1e3a5f', letterSpacing: 2, marginTop: 2 }}>OPERATIONS CENTER</div>
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/' && (location.pathname === '/' || location.pathname === '/dashboard'));
            return (
              <Link key={item.label} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
                <span style={{ fontSize: 14, opacity: 0.7 }}>{item.icon}</span>{item.label}
              </Link>
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

        {/* Main */}
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', display: 'flex', gap: 24 }} className="grid-bg">
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
              <div>
                <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, margin: 0 }}>Dispositivos — Datto RMM</h1>
                {!loading && devices.length > 0 && (
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#475569', marginTop: 6, letterSpacing: 1 }}>
                    {devices.length} dispositivos · <span style={{ color: '#22c55e' }}>{onlineCount} online</span> · <span style={{ color: '#64748b' }}>{offlineCount} offline</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                  Site:
                  <select className="filter-select" value={siteUid} onChange={(e) => setSiteUid(e.target.value)} disabled={loading} style={{ minWidth: 180 }}>
                    <option value="">Todos los sites</option>
                    {sitesSummary.map((s) => <option key={s.uid} value={s.uid}>{s.name}</option>)}
                  </select>
                </label>
                <button onClick={() => refetch()} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                  ↻ ACTUALIZAR
                </button>
              </div>
            </div>

            <ModuleErrorBanner error={error} apiMessage={apiMessage} module="devices" onRetry={refetch} retryLabel="↻ Actualizar" />

            {/* Summary cards */}
            {currentSiteSummary && (
              <div className="helpdex-card animate-in" style={{ padding: '20px 24px', marginBottom: 20 }}>
                <div className="section-title">RESUMEN POR TIPO{currentSiteSummary.name ? ` — ${currentSiteSummary.name.toUpperCase()}` : ''}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                  {[
                    { key: 'workstation', label: 'Workstation', color: '#3b82f6' },
                    { key: 'network', label: 'Network', color: '#8b5cf6' },
                    { key: 'esxi', label: 'ESXi', color: '#06b6d4' },
                    { key: 'printer', label: 'Printer', color: '#64748b' },
                    { key: 'unknown', label: 'Otros', color: '#94a3b8' },
                    { key: 'total', label: 'Total', color: '#0ea5e9' },
                  ].map(({ key, label, color }) => (
                    <div
                      key={key}
                      className="stat-card"
                      style={{ background: `${color}14`, border: `1px solid ${color}22`, cursor: key !== 'total' ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (key === 'total') return;
                        const map = { workstation: 'Workstation', network: 'Network', esxi: 'ESXi', printer: 'Printer', unknown: 'Unknown' };
                        const t = map[key] ?? '';
                        setTypeFilter((prev) => prev === t ? '' : t);
                      }}
                    >
                      <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color }}>{currentSiteSummary[key] ?? 0}</div>
                      <div className="helpdex-label" style={{ marginTop: 4, color }}>{label.toUpperCase()}</div>
                    </div>
                  ))}
                  <div className="stat-card" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', cursor: 'default' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: '#22c55e' }}>{currentSiteSummary.groupsCount ?? 0}</div>
                    <div className="helpdex-label" style={{ marginTop: 4, color: '#22c55e' }}>GRUPOS</div>
                  </div>
                </div>
              </div>
            )}

            {/* Device list */}
            <div className="helpdex-card animate-in" style={{ padding: '20px 24px' }}>
              {/* Filters bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#334155', fontSize: 13 }}>⌕</span>
                  <input
                    className="search-input"
                    style={{ width: '100%' }}
                    type="text"
                    placeholder="Buscar dispositivo, IP, usuario..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">Todos los tipos</option>
                  <option value="Workstation">Workstation</option>
                  <option value="Network">Network</option>
                  <option value="ESXi">ESXi</option>
                  <option value="Printer">Printer</option>
                </select>
                <select className="filter-select" value={onlineFilter} onChange={(e) => setOnlineFilter(e.target.value)}>
                  <option value="">Online / Offline</option>
                  <option value="online">Solo Online</option>
                  <option value="offline">Solo Offline</option>
                </select>
                {(search || typeFilter || onlineFilter) && (
                  <button
                    onClick={() => { setSearch(''); setTypeFilter(''); setOnlineFilter(''); }}
                    style={{ background: 'transparent', border: '1px solid #1a2744', color: '#475569', padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}
                  >
                    ✕ Limpiar
                  </button>
                )}
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#334155', marginLeft: 'auto' }}>
                  {filteredDevices.length} resultado{filteredDevices.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 130px 105px 70px', gap: 10, padding: '0 8px 10px', borderBottom: '1px solid #0f1e35' }}>
                {['DISPOSITIVO', 'TIPO', 'SITE', 'ÚLTIMO USUARIO', 'IP', 'ONLINE'].map((h) => (
                  <div key={h} className="helpdex-label">{h}</div>
                ))}
              </div>

              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>Cargando dispositivos…</div>
              ) : !configured ? (
                <div style={{ padding: 40, textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>
                  Configura <span style={{ color: '#38bdf8' }}>DATTO_RMM_*</span> en backend/.env
                </div>
              ) : filteredDevices.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>
                  {devices.length === 0 ? 'No hay dispositivos en este site.' : 'No hay resultados para los filtros seleccionados.'}
                </div>
              ) : (
                <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                  {filteredDevices.map((d) => {
                    const typeStyle = TYPE_LABELS[d.deviceClassLabel] ?? { label: d.deviceClassLabel || '—', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
                    const isSelected = detailUid === d.uid;
                    return (
                      <div
                        key={d.uid}
                        className="device-row"
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailUid(isSelected ? null : d.uid)}
                        onKeyDown={(e) => e.key === 'Enter' && setDetailUid(isSelected ? null : d.uid)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 110px 110px 130px 105px 70px',
                          gap: 10,
                          padding: '11px 8px',
                          alignItems: 'center',
                          background: isSelected ? 'rgba(14,165,233,0.08)' : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                            background: d.online ? '#22c55e' : '#334155',
                            boxShadow: d.online ? '0 0 4px rgba(34,197,94,0.6)' : 'none',
                          }} />
                          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.hostname || d.uid || '—'}
                          </span>
                        </div>
                        <span className="badge" style={{ background: typeStyle.bg, color: typeStyle.color }}>{typeStyle.label}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.siteName || '—'}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(d.lastLoggedInUser || '—').split('\\').pop()}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>{d.intIpAddress || d.extIpAddress || '—'}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: d.online ? '#22c55e' : '#475569' }}>{d.online ? 'Sí' : 'No'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {detailUid && (
            <div className="helpdex-card animate-in" style={{ width: 360, maxWidth: '100%', padding: '20px 22px', alignSelf: 'flex-start', position: 'sticky', top: 28, flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="section-title" style={{ margin: 0, padding: 0, border: 'none' }}>DETALLE DEL DISPOSITIVO</div>
                <button type="button" onClick={() => setDetailUid(null)} style={{ background: 'rgba(71,85,105,0.2)', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 15, width: 26, height: 26, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
              {detailLoading ? (
                <div style={{ padding: 32, textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>Cargando…</div>
              ) : detail ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: detail.online ? '#22c55e' : '#334155', flexShrink: 0, boxShadow: detail.online ? '0 0 6px rgba(34,197,94,0.6)' : 'none' }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{detail.hostname || detail.uid}</span>
                  </div>

                  <dl style={{ margin: 0, display: 'grid', gap: 8 }}>
                    {[
                      ['Tipo', detail.deviceClassLabel || detail.deviceClass],
                      ['Site', detail.siteName],
                      ['SO', (detail.operatingSystem || '').slice(0, 38)],
                      ['Último usuario', detail.lastLoggedInUser],
                      ['IP interna', detail.intIpAddress],
                      ['IP externa', detail.extIpAddress],
                      ['Dominio', detail.domain],
                      ['Última vez', formatDate(detail.lastSeen)],
                    ].map(([k, v]) => v ? (
                      <div key={k} style={{ display: 'flex', gap: 6, fontFamily: 'monospace', fontSize: 11 }}>
                        <span style={{ color: '#475569', minWidth: 96, flexShrink: 0 }}>{k}:</span>
                        <span style={{ color: '#cbd5e1', wordBreak: 'break-all' }}>{v}</span>
                      </div>
                    ) : null)}
                  </dl>

                  {detail.auditSummary?.hardware && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #0f1e35' }}>
                      <div className="helpdex-label" style={{ marginBottom: 8 }}>HARDWARE</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
                        {[detail.auditSummary.hardware.manufacturer, detail.auditSummary.hardware.model].filter(Boolean).join(' · ') || '—'}
                        {detail.auditSummary.hardware.totalPhysicalMemory != null && (
                          <span style={{ color: '#475569' }}> · {Math.round(detail.auditSummary.hardware.totalPhysicalMemory / 1073741824)} GB RAM</span>
                        )}
                        {detail.auditSummary.hardware.totalCpuCores != null && (
                          <span style={{ color: '#475569' }}> · {detail.auditSummary.hardware.totalCpuCores} núcleos</span>
                        )}
                      </div>
                    </div>
                  )}

                  {alerts.length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #0f1e35' }}>
                      <div className="helpdex-label" style={{ marginBottom: 8, color: '#f97316' }}>⚠ ALERTAS ({alerts.length})</div>
                      <ul style={{ margin: 0, paddingLeft: 16, fontFamily: 'monospace', fontSize: 10, color: '#f97316', lineHeight: 1.7 }}>
                        {alerts.slice(0, 5).map((a, i) => (
                          <li key={a.alertUid || i}>{a.diagnostics || a.priority || 'Alerta activa'}</li>
                        ))}
                        {alerts.length > 5 && <li style={{ color: '#64748b' }}>+{alerts.length - 5} más alertas</li>}
                      </ul>
                    </div>
                  )}

                  {detail.portalUrl && (
                    <div style={{ marginTop: 18 }}>
                      <a
                        href={detail.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', background: '#0ea5e9', color: '#fff', padding: '9px 18px', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, textDecoration: 'none', letterSpacing: 0.5 }}
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
