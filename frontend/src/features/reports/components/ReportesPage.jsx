/**
 * Reportes básicos: tickets por estado/periodo, dispositivos por site/tipo, parches por categoría. Export CSV.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchReportsSummary } from '../api/reportsApi';
import { ModuleErrorBanner } from '../../../shared/components/ModuleErrorBanner';

const NAV_ITEMS = [
  { icon: '▣', label: 'Dashboard', path: '/' },
  { icon: '◈', label: 'Mis Tickets', path: '/mis-tickets' },
  { icon: '◉', label: 'Parches', path: '/parches' },
  { icon: '◎', label: 'Dispositivos', path: '/dispositivos' },
  { icon: '⬡', label: 'IA Asistente', path: '/ia-asistente' },
  { icon: '◇', label: 'Reportes', path: '/reportes' },
];

function buildReportCsv(data) {
  const rows = [];
  rows.push('Reporte HELPDEX');
  rows.push(`Generado,${data.generatedAt || new Date().toISOString()}`);
  rows.push('');

  rows.push('Tickets (por estado)');
  rows.push('Periodo,' + (data.tickets?.period || ''));
  rows.push('Total,' + (data.tickets?.total ?? 0));
  if (data.tickets?.byStatus && Object.keys(data.tickets.byStatus).length) {
    rows.push('Estado,Cantidad');
    for (const [status, count] of Object.entries(data.tickets.byStatus)) {
      rows.push(`"${String(status).replace(/"/g, '""')}",${count}`);
    }
  }
  if (data.tickets?.error) rows.push('Error,' + data.tickets.error);
  rows.push('');

  rows.push('Dispositivos (por tipo)');
  rows.push('Total,' + (data.devices?.total ?? 0));
  if (data.devices?.byType && typeof data.devices.byType === 'object') {
    rows.push('Tipo,Cantidad');
    for (const [type, count] of Object.entries(data.devices.byType)) {
      rows.push(`"${type}",${count}`);
    }
  }
  if (data.devices?.sites?.length) {
    rows.push('');
    rows.push('Por site');
    rows.push('Site,Total,Workstation,Network,ESXi,Printer,Unknown');
    for (const s of data.devices.sites) {
      const bt = s.byType || {};
      rows.push(`"${(s.siteName || '').replace(/"/g, '""')}",${s.total ?? 0},${bt.Workstation ?? 0},${bt.Network ?? 0},${bt.ESXi ?? 0},${bt.Printer ?? 0},${bt.Unknown ?? 0}`);
    }
  }
  if (data.devices?.error) rows.push('Error,' + data.devices.error);
  rows.push('');

  rows.push('Parches (por categoría)');
  rows.push('Total dispositivos,' + (data.patches?.total ?? 0));
  if (data.patches?.byCategory?.length) {
    rows.push('Categoría,Cantidad');
    for (const c of data.patches.byCategory) {
      rows.push(`"${(c.label || '').replace(/"/g, '""')}",${c.count ?? 0}`);
    }
  }
  if (data.patches?.error) rows.push('Error,' + data.patches.error);

  return rows.join('\r\n');
}

function downloadCsv(data) {
  const csv = buildReportCsv(data);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `helpdex-reporte-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportesPage() {
  const location = useLocation();
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReportsSummary(period);
      setData(res);
    } catch (e) {
      setError(e.message || 'Error al cargar reportes');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <style>{`
        .helpdex-card { background: #0a1628; border: 1px solid #1a2744; border-radius: 10px; }
        .helpdex-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #475569; }
        .section-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #1e4976; padding-bottom: 12px; border-bottom: 1px solid #0f1e35; margin-bottom: 16px; }
        .nav-item { padding: 8px 12px; border-radius: 6px; font-size: 12px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; color: #475569; transition: all 0.15s; display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
        .nav-item:hover { background: #0d1d36; color: #94a3b8; }
        .nav-item.active { background: #0e2a4d; color: #38bdf8; border-left: 2px solid #0ea5e9; }
        .grid-bg { background-image: linear-gradient(rgba(14,77,145,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,77,145,0.05) 1px, transparent 1px); background-size: 32px 32px; }
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
              <div key={item.label} className="nav-item" style={{ opacity: 0.6, cursor: 'not-allowed' }}>{content}</div>
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

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }} className="grid-bg">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>Reportes</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                Periodo tickets:
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  disabled={loading}
                  style={{ background: '#0a1628', border: '1px solid #1a2744', color: '#cbd5e1', padding: '6px 12px', borderRadius: 6, fontFamily: 'monospace', fontSize: 11 }}
                >
                  <option value="24h">Últimas 24 h</option>
                  <option value="7d">Últimos 7 días</option>
                  <option value="6m">Últimos 6 meses</option>
                </select>
              </label>
              <button onClick={() => load()} disabled={loading} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>Actualizar</button>
              <button onClick={() => data && downloadCsv(data)} disabled={!data || loading} style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.4)', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>Exportar CSV</button>
            </div>
          </div>

          <ModuleErrorBanner error={error} apiMessage={null} module="reports" onRetry={load} retryLabel="Actualizar" />

          {loading && !data ? (
            <div style={{ padding: 48, textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>Cargando reportes…</div>
          ) : data && (
            <>
              <div className="helpdex-card" style={{ padding: '22px 24px', marginBottom: 24 }}>
                <div className="section-title">TICKETS POR ESTADO (periodo: {period})</div>
                {data.tickets?.error ? (
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#f97316' }}>{data.tickets.error}</p>
                ) : (
                  <>
                    <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>Total: <strong style={{ color: '#f1f5f9' }}>{data.tickets?.total ?? 0}</strong></p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {data.tickets?.byStatus && Object.entries(data.tickets.byStatus).map(([status, count]) => (
                        <div key={status} style={{ background: 'rgba(59,130,246,0.12)', borderRadius: 8, padding: '10px 14px', minWidth: 120 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>{count}</div>
                          <div className="helpdex-label" style={{ marginTop: 4 }}>{status}</div>
                        </div>
                      ))}
                      {(!data.tickets?.byStatus || Object.keys(data.tickets.byStatus).length === 0) && <span style={{ color: '#64748b', fontSize: 11 }}>Sin datos</span>}
                    </div>
                  </>
                )}
              </div>

              <div className="helpdex-card" style={{ padding: '22px 24px', marginBottom: 24 }}>
                <div className="section-title">DISPOSITIVOS POR TIPO Y SITE</div>
                {data.devices?.error ? (
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#f97316' }}>{data.devices.error}</p>
                ) : !data.devices?.configured ? (
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>Datto RMM no configurado.</p>
                ) : (
                  <>
                    <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>Total dispositivos: <strong style={{ color: '#f1f5f9' }}>{data.devices?.total ?? 0}</strong></p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                      {data.devices?.byType && Object.entries(data.devices.byType).map(([type, count]) => (
                        <div key={type} style={{ background: 'rgba(14,165,233,0.12)', borderRadius: 8, padding: '10px 14px', minWidth: 100 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#0ea5e9' }}>{count}</div>
                          <div className="helpdex-label" style={{ marginTop: 4 }}>{type}</div>
                        </div>
                      ))}
                    </div>
                    {data.devices?.sites?.length > 0 && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontFamily: 'monospace', fontSize: 11, borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #0f1e35' }}>
                              <th style={{ textAlign: 'left', padding: '8px', color: '#475569' }}>Site</th>
                              <th style={{ textAlign: 'right', padding: '8px', color: '#475569' }}>Total</th>
                              <th style={{ textAlign: 'right', padding: '8px', color: '#475569' }}>Workstation</th>
                              <th style={{ textAlign: 'right', padding: '8px', color: '#475569' }}>Network</th>
                              <th style={{ textAlign: 'right', padding: '8px', color: '#475569' }}>ESXi</th>
                              <th style={{ textAlign: 'right', padding: '8px', color: '#475569' }}>Printer</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.devices.sites.map((s, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #0f1e35' }}>
                                <td style={{ padding: '8px', color: '#cbd5e1' }}>{s.siteName}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#94a3b8' }}>{s.total}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#94a3b8' }}>{s.byType?.Workstation ?? 0}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#94a3b8' }}>{s.byType?.Network ?? 0}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#94a3b8' }}>{s.byType?.ESXi ?? 0}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#94a3b8' }}>{s.byType?.Printer ?? 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="helpdex-card" style={{ padding: '22px 24px' }}>
                <div className="section-title">PARCHES POR CATEGORÍA</div>
                {data.patches?.error ? (
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#f97316' }}>{data.patches.error}</p>
                ) : !data.patches?.configured ? (
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>Datto RMM no configurado.</p>
                ) : (
                  <>
                    <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>Dispositivos con estado de parches: <strong style={{ color: '#f1f5f9' }}>{data.patches?.total ?? 0}</strong></p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                      {data.patches?.byCategory?.map((c, i) => (
                        <div key={i} style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#22c55e' }}>{c.count}</div>
                          <div className="helpdex-label" style={{ marginTop: 4 }}>{c.label}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
