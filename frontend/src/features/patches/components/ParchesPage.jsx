/**
 * Parches — Dispositivos RMM y estado de parches por categoría (Datto RMM).
 * Filtro por Site, actualización cada 5 min. IA para solucionar problemas de parches.
 */
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePatches } from "../hooks/usePatches";

const STATUS_ORDER = ['InstallError', 'NoPolicy', 'NoData', 'RebootRequired', 'ApprovedPending', 'FullyPatched'];
const STATUS_COLORS = {
  InstallError: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  NoPolicy: { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
  NoData: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  RebootRequired: { bg: 'rgba(234,179,8,0.12)', color: '#eab308' },
  ApprovedPending: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  FullyPatched: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function ParchesPage() {
  const location = useLocation();
  const [siteUid, setSiteUid] = useState('');
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
        .patch-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 1px; padding: 2px 8px; border-radius: 3px; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside style={{ width: 220, background: "#06101e", borderRight: "1px solid #0f1e35", display: "flex", flexDirection: "column", padding: "24px 12px", gap: 4, position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
          <div style={{ padding: "0 8px 28px" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#0ea5e9", letterSpacing: 1 }}>HELPDEX</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#1e3a5f", letterSpacing: 2, marginTop: 2 }}>OPERATIONS CENTER</div>
          </div>
          {[
            { icon: "▣", label: "Dashboard", path: "/" },
            { icon: "◈", label: "Mis Tickets", path: "/mis-tickets" },
            { icon: "◉", label: "Parches", path: "/parches" },
            { icon: "◎", label: "Dispositivos", path: "/dispositivos" },
            { icon: "⬡", label: "IA Asistente", path: "/ia-asistente" },
            { icon: "◇", label: "Reportes", path: null },
          ].map((item) => {
            const isActive = item.path ? (location.pathname === item.path || (item.path === "/" && (location.pathname === "/" || location.pathname === "/dashboard"))) : false;
            const content = (<><span style={{ fontSize: 14, opacity: 0.7 }}>{item.icon}</span>{item.label}</>);
            return item.path ? (
              <Link key={item.label} to={item.path} className={`nav-item ${isActive ? "active" : ""}`}>{content}</Link>
            ) : (
              <div key={item.label} className="nav-item" style={{ opacity: 0.6, cursor: "not-allowed" }} title="Próximamente">{content}</div>
            );
          })}
          <div style={{ flex: 1 }} />
          <div style={{ borderTop: "1px solid #0f1e35", paddingTop: 16, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff", fontFamily: "monospace" }}>AR</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Tech L2</div>
                <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace" }}>AutoTask · Datto</div>
              </div>
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }} className="grid-bg">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>Estado de parches — Datto RMM</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                Site:
                <select
                  value={siteUid}
                  onChange={(e) => setSiteUid(e.target.value)}
                  disabled={loadingSites}
                  style={{ background: "#0a1628", border: "1px solid #1a2744", color: "#cbd5e1", padding: "6px 12px", borderRadius: 6, fontFamily: "monospace", fontSize: 11, minWidth: 180 }}
                >
                  <option value="">Todos los sites</option>
                  {sites.map((s) => (
                    <option key={s.uid} value={s.uid}>{s.name}</option>
                  ))}
                </select>
              </label>
              <button onClick={() => refetch()} style={{ background: "#0ea5e9", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                ↻ ACTUALIZAR
              </button>
            </div>
          </div>

          {apiMessage && (
            <div style={{ padding: "12px 16px", background: "rgba(234,179,8,0.12)", borderRadius: 6, marginBottom: 16, fontFamily: "monospace", fontSize: 12, color: "#eab308" }}>{apiMessage}</div>
          )}
          {error && (
            <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.12)", borderRadius: 6, marginBottom: 16, fontFamily: "monospace", fontSize: 12, color: "#ef4444" }}>{error}</div>
          )}

          {lastUpdated && (
            <div style={{ marginBottom: 16, fontFamily: "monospace", fontSize: 10, color: "#475569" }}>
              Última actualización: {formatDate(lastUpdated)} · Se actualiza cada 5 min
            </div>
          )}

          {/* Resumen por categoría */}
          <div className="helpdex-card" style={{ padding: "22px 24px", marginBottom: 24 }}>
            <div className="section-title">RESUMEN POR CATEGORÍA DE PATCH</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {STATUS_ORDER.map((key) => {
                const count = summary[key] ?? 0;
                const label = summaryLabels[key] ?? key;
                const style = STATUS_COLORS[key] ?? { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' };
                return (
                  <div key={key} style={{ background: style.bg, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: style.color }}>{count}</div>
                    <div className="helpdex-label" style={{ marginTop: 4 }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* IA: cómo solucionar problemas de parches */}
          <div className="helpdex-card" style={{ padding: "16px 20px", marginBottom: 24, borderColor: "rgba(129,140,248,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>
                ¿Los parches no se aplican correctamente? Pregunta a la IA cómo solucionarlo.
              </span>
              <Link
                to="/ia-asistente?context=parches"
                style={{ background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)", color: "#818cf8", padding: "6px 14px", borderRadius: 6, fontFamily: "monospace", fontSize: 11, textDecoration: "none", fontWeight: 600 }}
              >
                Preguntar a la IA →
              </Link>
            </div>
          </div>

          {/* Tabla de dispositivos */}
          <div className="helpdex-card" style={{ padding: "22px 24px" }}>
            <div className="section-title">DISPOSITIVOS CONECTADOS AL RMM</div>
            {loading ? (
              <div style={{ padding: 32, textAlign: "center", fontFamily: "monospace", fontSize: 12, color: "#64748b" }}>Cargando…</div>
            ) : !configured ? (
              <div style={{ padding: 32, textAlign: "center", fontFamily: "monospace", fontSize: 11, color: "#475569" }}>
                Configura DATTO_RMM_API_URL, DATTO_RMM_API_KEY y DATTO_RMM_API_SECRET en el backend.
              </div>
            ) : devices.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", fontFamily: "monospace", fontSize: 11, color: "#475569" }}>
                No hay dispositivos en este site o la cuenta.
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 90px 140px", gap: 12, padding: "0 0 10px", borderBottom: "1px solid #0f1e35", marginBottom: 8 }}>
                  {["DISPOSITIVO", "SITE", "ESTADO PATCH", "ONLINE", "ÚLTIMA VEZ"].map((h) => (
                    <div key={h} className="helpdex-label">{h}</div>
                  ))}
                </div>
                <div style={{ maxHeight: 420, overflowY: "auto" }}>
                  {devices.map((d) => {
                    const statusStyle = STATUS_COLORS[d.patchStatus] ?? { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' };
                    return (
                      <div
                        key={d.uid}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 120px 100px 90px 140px",
                          gap: 12,
                          padding: "10px 0",
                          alignItems: "center",
                          borderBottom: "1px solid #0f1e35",
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ color: "#cbd5e1", fontWeight: 600 }}>{d.hostname || d.uid || '—'}</div>
                        <div style={{ color: "#64748b" }}>{d.siteName || '—'}</div>
                        <span className="patch-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>{d.patchStatusLabel || d.patchStatus || '—'}</span>
                        <span style={{ color: d.online ? '#22c55e' : '#64748b' }}>{d.online ? 'Sí' : 'No'}</span>
                        <div style={{ color: "#475569", fontSize: 11 }}>{formatDate(d.lastSeen)}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
