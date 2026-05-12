import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePatches } from '../hooks/usePatches';
import { ModuleErrorBanner } from '../../../shared/components/ModuleErrorBanner';

const STATUS_ORDER = ['InstallError', 'NoPolicy', 'NoData', 'RebootRequired', 'ApprovedPending', 'FullyPatched'];
const STATUS_COLORS = {
  InstallError:    { bg: 'rgba(239,68,68,0.18)',    color: '#fca5a5', border: '#ef4444', dot: '#ef4444' },
  NoPolicy:        { bg: 'rgba(249,115,22,0.18)',    color: '#fdba74', border: '#f97316', dot: '#f97316' },
  NoData:          { bg: 'rgba(100,116,139,0.22)',   color: '#cbd5e1', border: '#64748b', dot: '#64748b' },
  RebootRequired:  { bg: 'rgba(234,179,8,0.18)',     color: '#fde047', border: '#eab308', dot: '#eab308' },
  ApprovedPending: { bg: 'rgba(59,130,246,0.18)',    color: '#93c5fd', border: '#3b82f6', dot: '#3b82f6' },
  FullyPatched:    { bg: 'rgba(34,197,94,0.18)',     color: '#86efac', border: '#22c55e', dot: '#22c55e' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
  } catch { return iso; }
}

const NAV_ITEMS = [
  { icon: '▣', label: 'Dashboard', path: '/' },
  { icon: '◈', label: 'Mis Tickets', path: '/mis-tickets' },
  { icon: '◉', label: 'Parches', path: '/parches' },
  { icon: '◎', label: 'Dispositivos', path: '/dispositivos' },
  { icon: '⬡', label: 'IA Asistente', path: '/ia-asistente' },
  { icon: '◇', label: 'Reportes', path: '/reportes' },
];

export function ParchesPage() {
  const location = useLocation();
  const [siteUid, setSiteUid] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [onlineFilter, setOnlineFilter] = useState('');
  const {
    sites,
    devices,
    summary,
    summaryLabels,
    lastUpdated,
    loading,
    loadingSites,
    error,
    configured,
    apiMessage,
    refetch,
  } = usePatches(siteUid || null);

  const filteredDevices = useMemo(() => {
    let list = selectedCategory ? devices.filter((d) => d.patchStatus === selectedCategory) : devices;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          (d.hostname || '').toLowerCase().includes(q) ||
          (d.siteName || '').toLowerCase().includes(q)
      );
    }
    if (onlineFilter === 'online') list = list.filter((d) => d.online);
    if (onlineFilter === 'offline') list = list.filter((d) => !d.online);
    return list;
  }, [devices, selectedCategory, search, onlineFilter]);

  const totalDevices = devices.length;
  const compliantCount = summary['FullyPatched'] ?? 0;
  const criticalCount = (summary['InstallError'] ?? 0) + (summary['RebootRequired'] ?? 0);
  const compliancePercent = totalDevices > 0 ? Math.round((compliantCount / totalDevices) * 100) : 0;

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
        .patch-cat-btn { transition: transform 0.15s ease, opacity 0.15s ease; cursor: pointer; border: none; text-align: center; }
        .patch-cat-btn:hover { transform: translateY(-2px); }
        .patch-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 1px; padding: 2px 8px; border-radius: 3px; white-space: nowrap; }
        .filter-select { background: #0a1628; border: 1px solid #1a2744; color: #cbd5e1; padding: 7px 11px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; cursor: pointer; }
        .filter-select:focus { outline: none; border-color: #0ea5e9; }
        .search-input { background: #0a1628; border: 1px solid #1a2744; color: #cbd5e1; padding: 7px 11px 7px 32px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
        .search-input::placeholder { color: #334155; }
        .search-input:focus { outline: none; border-color: #0ea5e9; }
        .device-row { border-bottom: 1px solid #0f1e35; transition: background 0.12s; }
        .device-row:hover { background: rgba(14,165,233,0.05); }
        .device-row:last-child { border-bottom: none; }
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
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }} className="grid-bg">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, margin: 0 }}>Estado de parches — Datto RMM</h1>
              {lastUpdated && (
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#475569', marginTop: 6, letterSpacing: 1 }}>
                  Última actualización: {formatDate(lastUpdated)} · Se actualiza cada 5 min
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                Site:
                <select className="filter-select" value={siteUid} onChange={(e) => setSiteUid(e.target.value)} disabled={loadingSites} style={{ minWidth: 180 }}>
                  <option value="">Todos los sites</option>
                  {sites.map((s) => <option key={s.uid} value={s.uid}>{s.name}</option>)}
                </select>
              </label>
              <button onClick={() => refetch()} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                ↻ ACTUALIZAR
              </button>
            </div>
          </div>

          <ModuleErrorBanner error={error} apiMessage={apiMessage} module="patches" onRetry={refetch} retryLabel="↻ Actualizar" />

          {/* Compliance summary bar */}
          {!loading && configured && totalDevices > 0 && (
            <div className="helpdex-card animate-in" style={{ padding: '16px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>Cumplimiento general</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: compliancePercent >= 80 ? '#22c55e' : compliancePercent >= 50 ? '#eab308' : '#ef4444' }}>{compliancePercent}%</span>
                </div>
                <div style={{ height: 6, background: '#0f1e35', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${compliancePercent}%`, background: compliancePercent >= 80 ? '#22c55e' : compliancePercent >= 50 ? '#eab308' : '#ef4444', borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#22c55e' }}>{compliantCount}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#475569', letterSpacing: 1 }}>COMPLIANT</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{criticalCount}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#475569', letterSpacing: 1 }}>CRÍTICO</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#94a3b8' }}>{totalDevices}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#475569', letterSpacing: 1 }}>TOTAL</div>
                </div>
              </div>
            </div>
          )}

          {/* Category cards */}
          <div className="helpdex-card animate-in" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <div className="section-title">ESTADO POR CATEGORÍA — clic para filtrar</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {STATUS_ORDER.map((key) => {
                const count = summary[key] ?? 0;
                const label = summaryLabels[key] ?? key;
                const s = STATUS_COLORS[key] ?? { bg: 'rgba(148,163,184,0.18)', color: '#cbd5e1', border: '#94a3b8', dot: '#94a3b8' };
                const isSelected = selectedCategory === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className="patch-cat-btn"
                    onClick={() => setSelectedCategory(isSelected ? '' : key)}
                    style={{
                      background: isSelected ? s.border : s.bg,
                      color: isSelected ? '#0f172a' : s.color,
                      border: `2px solid ${isSelected ? s.border : 'transparent'}`,
                      borderRadius: 8,
                      padding: '14px 12px',
                      fontFamily: 'monospace',
                      boxShadow: isSelected ? `0 0 12px ${s.border}44` : 'none',
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{count}</div>
                    <div style={{ marginTop: 5, fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', opacity: isSelected ? 0.85 : 0.9 }}>{label}</div>
                  </button>
                );
              })}
            </div>
            {selectedCategory && (
              <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[selectedCategory]?.dot, flexShrink: 0 }} />
                Filtrando: <strong style={{ color: STATUS_COLORS[selectedCategory]?.color }}>{summaryLabels[selectedCategory] ?? selectedCategory}</strong>
                <button type="button" onClick={() => setSelectedCategory('')} style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, marginLeft: 4 }}>
                  ✕ Quitar filtro
                </button>
              </div>
            )}
          </div>

          {/* IA link */}
          <div className="helpdex-card animate-in" style={{ padding: '14px 20px', marginBottom: 20, borderColor: 'rgba(129,140,248,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>
                ¿Los parches no se aplican correctamente? Pregunta a la IA cómo solucionarlo.
              </span>
              <Link to="/ia-asistente?context=parches" style={{ background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', color: '#818cf8', padding: '6px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>
                Preguntar a la IA →
              </Link>
            </div>
          </div>

          {/* Device list */}
          <div className="helpdex-card animate-in" style={{ padding: '20px 24px' }}>
            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#334155', fontSize: 13 }}>⌕</span>
                <input
                  className="search-input"
                  style={{ width: '100%' }}
                  type="text"
                  placeholder="Buscar dispositivo o site..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="filter-select" value={onlineFilter} onChange={(e) => setOnlineFilter(e.target.value)}>
                <option value="">Online / Offline</option>
                <option value="online">Solo Online</option>
                <option value="offline">Solo Offline</option>
              </select>
              {(search || onlineFilter) && (
                <button
                  onClick={() => { setSearch(''); setOnlineFilter(''); }}
                  style={{ background: 'transparent', border: '1px solid #1a2744', color: '#475569', padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}
                >
                  ✕ Limpiar
                </button>
              )}
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#334155', marginLeft: 'auto' }}>
                {filteredDevices.length} dispositivo{filteredDevices.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 70px 140px', gap: 12, padding: '0 8px 10px', borderBottom: '1px solid #0f1e35' }}>
              {['DISPOSITIVO', 'SITE', 'ESTADO PATCH', 'ONLINE', 'ÚLTIMA VEZ'].map((h) => (
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
                {devices.length === 0 ? 'No hay dispositivos.' : 'Sin resultados para los filtros seleccionados.'}
              </div>
            ) : (
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                {filteredDevices.map((d) => {
                  const s = STATUS_COLORS[d.patchStatus] ?? { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', dot: '#64748b' };
                  return (
                    <div key={d.uid} className="device-row" style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 70px 140px', gap: 12, padding: '10px 8px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: d.online ? '#22c55e' : '#334155', boxShadow: d.online ? '0 0 4px rgba(34,197,94,0.5)' : 'none' }} />
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.hostname || d.uid || '—'}</span>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.siteName || '—'}</span>
                      <span className="patch-badge" style={{ background: s.bg, color: s.color, borderLeft: `2px solid ${s.dot}` }}>{d.patchStatusLabel || d.patchStatus || '—'}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: d.online ? '#22c55e' : '#475569' }}>{d.online ? 'Sí' : 'No'}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>{formatDate(d.lastSeen)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
