/**
 * Mis Tickets — Listado con selector de período (24h, 7d, 6m, todos).
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTickets } from "../hooks/useTickets";
import { useTicketWithSuggestions } from "../hooks/useTicketWithSuggestions";
import { fetchResources, fetchTicketStatus, fetchTicketStatusIds } from "../api/ticketsApi";

const PERIOD_OPTIONS = [
  { value: "24h", label: "Últimas 24 horas" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "all", label: "Todos los tickets" },
];

function formatRelative(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now - d;
  const min = Math.floor(diffMs / 60000);
  const h = Math.floor(min / 60);
  if (min < 60) return `hace ${min} min`;
  if (h < 24) return `hace ${h}h ${min % 60}m`;
  const days = Math.floor(h / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

const priorityConfig = {
  Normal: { color: "#0ea5e9", bg: "rgba(14,165,233,0.12)", label: "Normal" },
  Media: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "Media" },
  Alta: { color: "#eab308", bg: "rgba(234,179,8,0.12)", label: "Alta" },
  Critica: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "Crítica" },
};

const statusColor = {
  "In Progress": "#0ea5e9",
  "Complete": "#22c55e",
  "Waiting Customer": "#f97316",
  "Waiting Vendor": "#eab308",
  "Work Complete": "#22c55e",
  "New": "#22d3ee",
};

export function MisTicketsPage() {
  const location = useLocation();
  const [period, setPeriod] = useState("7d");
  const [activeTicket, setActiveTicket] = useState(null);
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [resources, setResources] = useState([]);
  const [statusLabels, setStatusLabels] = useState({});
  const [myResourceId, setMyResourceId] = useState(null);

  const assignedResourceId =
    assignedToFilter === "" ? undefined : assignedToFilter === "me" ? "me" : Number(assignedToFilter);
  const statusIds = statusFilter ? [Number(statusFilter)] : undefined;
  const { tickets, loading: ticketsLoading, error: ticketsError, apiMessage, backendUnavailable, refetch: refetchTickets } = useTickets({
    limit: 500,
    period,
    assignedResourceId,
    status: statusIds,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusData, list, statusIdsData] = await Promise.all([fetchTicketStatus(), fetchResources(), fetchTicketStatusIds().catch(() => ({}))]);
        if (!cancelled) {
          if (statusData?.my_resource_id != null) setMyResourceId(statusData.my_resource_id);
          if (Array.isArray(list)) setResources(list);
          if (statusIdsData && typeof statusIdsData === "object") setStatusLabels(statusIdsData);
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);
  const { data: ticketDetail, loading: detailLoading, error: detailError, loadTicket: loadTicketDetail, clear: clearDetail } = useTicketWithSuggestions();

  useEffect(() => {
    if (activeTicket) loadTicketDetail(activeTicket);
    else clearDetail();
  }, [activeTicket, loadTicketDetail, clearDetail]);

  return (
    <>
      <style>{`
        .helpdex-card { background: #0a1628; border: 1px solid #1a2744; border-radius: 10px; animation: slideIn 0.4s ease forwards; }
        .helpdex-card:hover { border-color: #0e4d91; transition: border-color 0.2s; }
        .helpdex-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #475569; }
        .ticket-row { border-bottom: 1px solid #0f1e35; transition: background 0.15s; cursor: pointer; }
        .ticket-row:hover { background: #0d1d36; }
        .ticket-row:last-child { border-bottom: none; }
        .helpdex-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; padding: 2px 7px; border-radius: 3px; text-transform: uppercase; }
        .section-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #1e4976; padding-bottom: 12px; border-bottom: 1px solid #0f1e35; margin-bottom: 16px; }
        .nav-item { padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; color: #475569; transition: all 0.15s; display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
        .nav-item:hover { background: #0d1d36; color: #94a3b8; }
        .nav-item.active { background: #0e2a4d; color: #38bdf8; border-left: 2px solid #0ea5e9; }
        .grid-bg { background-image: linear-gradient(rgba(14,77,145,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,77,145,0.05) 1px, transparent 1px); background-size: 32px 32px; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside
          style={{
            width: 220,
            background: "#06101e",
            borderRight: "1px solid #0f1e35",
            display: "flex",
            flexDirection: "column",
            padding: "24px 12px",
            gap: 4,
            position: "sticky",
            top: 0,
            height: "100vh",
            flexShrink: 0,
          }}
        >
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>Mis Tickets</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                Período:
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  style={{
                    background: "#0a1628",
                    border: "1px solid #1a2744",
                    color: "#cbd5e1",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontFamily: "monospace",
                    fontSize: 12,
                    cursor: "pointer",
                    minWidth: 180,
                  }}
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                Estado:
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    background: "#0a1628",
                    border: "1px solid #1a2744",
                    color: "#cbd5e1",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontFamily: "monospace",
                    fontSize: 12,
                    cursor: "pointer",
                    minWidth: 160,
                  }}
                >
                  <option value="">Todos los estados</option>
                  {Object.entries(statusLabels).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                Asignado a:
                <select
                  value={assignedToFilter}
                  onChange={(e) => setAssignedToFilter(e.target.value)}
                  style={{
                    background: "#0a1628",
                    border: "1px solid #1a2744",
                    color: "#cbd5e1",
                    padding: "8px 12px",
                    borderRadius: 6,
                    fontFamily: "monospace",
                    fontSize: 12,
                    cursor: "pointer",
                    minWidth: 160,
                  }}
                >
                  <option value="">Todos</option>
                  {myResourceId != null && <option value="me">Yo</option>}
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>{r.fullName}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => refetchTickets()}
                style={{
                  background: "transparent",
                  border: "1px solid #1a2744",
                  color: "#475569",
                  padding: "8px 14px",
                  borderRadius: 5,
                  fontFamily: "monospace",
                  fontSize: 10,
                  cursor: "pointer",
                  letterSpacing: 1,
                }}
              >
                ↻ ACTUALIZAR
              </button>
            </div>
          </div>

          <div className="helpdex-card" style={{ padding: "22px 24px" }}>
            <div className="section-title" style={{ marginBottom: 4, paddingBottom: 0, borderBottom: "none" }}>HISTORIAL — AUTOTASK</div>
            <div style={{ borderBottom: "1px solid #0f1e35", marginBottom: 16 }} />
            {backendUnavailable && (
              <div style={{ padding: "12px 16px", background: "rgba(249,115,22,0.12)", borderRadius: 6, marginBottom: 12, fontFamily: "monospace", fontSize: 12, color: "#f97316" }}>
                Backend no disponible. Inicia el backend con <strong>php artisan serve</strong> en la carpeta backend.
              </div>
            )}
            {apiMessage && !backendUnavailable && (
              <div style={{ padding: "12px 16px", background: "rgba(14,165,233,0.12)", borderRadius: 6, marginBottom: 12, fontFamily: "monospace", fontSize: 12, color: "#38bdf8" }}>{apiMessage}</div>
            )}
            {ticketsError && !backendUnavailable && !apiMessage && (
              <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", borderRadius: 6, marginBottom: 12, fontFamily: "monospace", fontSize: 12, color: "#ef4444" }}>{ticketsError}</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 120px 100px 90px 70px 80px", gap: 12, padding: "0 16px 10px" }}>
              {["TICKET", "TÍTULO / ESTATUS", "COLA", "PRIORIDAD", "ESTADO", "ACTIVIDAD", "TECH"].map((h) => (
                <div key={h} className="helpdex-label">{h}</div>
              ))}
            </div>
            {ticketsLoading ? (
              <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>Cargando tickets…</div>
            ) : tickets.length === 0 && !backendUnavailable ? (
              <div style={{ padding: 32, textAlign: "center", color: "#64748b", fontFamily: "monospace", fontSize: 13, borderTop: "1px solid #0f1e35" }}>
                No hay tickets en este período.
                {apiMessage && <div style={{ marginTop: 10, color: "#38bdf8", fontSize: 12 }}>{apiMessage}</div>}
              </div>
            ) : (
              tickets.map((t, i) => {
                const statusLbl = t.statusLabel || t.status || "—";
                const priorityLbl = (priorityConfig[t.priorityLabel] && priorityConfig[t.priorityLabel].label) ? priorityConfig[t.priorityLabel].label : (t.priorityLabel || "—");
                const priorityStyle = priorityConfig[t.priorityLabel] || { bg: "rgba(148,163,184,0.12)", color: "#94a3b8" };
                const statusStyle = statusColor[statusLbl] || "#94a3b8";
                return (
                  <div key={t.id}>
                    <div
                      className="ticket-row"
                      style={{ display: "grid", gridTemplateColumns: "100px 1fr 120px 100px 90px 70px 80px", gap: 12, padding: "14px 16px", alignItems: "center" }}
                      onClick={() => setActiveTicket(activeTicket === t.id ? null : t.id)}
                    >
                      <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#0ea5e9" }}>{t.ticketNumber || t.id}</div>
                      <div>
                        <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600, marginBottom: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 340 }}>{t.title}</div>
                        <span className="helpdex-badge" style={{ background: `${statusStyle}18`, color: statusStyle }}>{statusLbl}</span>
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{t.queueLabel ?? "—"}</div>
                      <div>
                        <span className="helpdex-badge" style={{ background: priorityStyle.bg, color: priorityStyle.color }}>{priorityLbl}</span>
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: "#475569" }}>{formatRelative(t.completedDate || t.lastActivityDate)}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#818cf8" }}>{t.estimatedHours != null ? `${Number(t.estimatedHours)}h` : "—"}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {t.assignedResource ? (
                          <div title={t.assignedResource.fullName} style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 10, color: "#fff", fontFamily: "monospace" }}>{t.assignedResource.initials || "—"}</div>
                        ) : (
                          <span style={{ fontSize: 10, color: "#64748b" }}>—</span>
                        )}
                      </div>
                    </div>
                    {activeTicket === t.id && (
                      <div style={{ background: "#0d1d36", borderTop: "1px solid #0f1e35", borderBottom: "1px solid #0f1e35", padding: "16px 20px", animation: "slideIn 0.2s ease" }}>
                        {detailLoading ? (
                          <div style={{ color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>Cargando detalle y sugerencias IA…</div>
                        ) : detailError ? (
                          <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", borderRadius: 6, fontFamily: "monospace", fontSize: 12, color: "#ef4444" }}>
                            No se pudo cargar el detalle: {detailError}
                          </div>
                        ) : ticketDetail?.ticket ? (
                          <>
                            {ticketDetail.ticket.description && (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#64748b", letterSpacing: 1, marginBottom: 6 }}>DESCRIPCIÓN DEL PROBLEMA</div>
                                <p style={{ fontFamily: "monospace", fontSize: 12, color: "#cbd5e1", lineHeight: 1.7, maxWidth: 720, whiteSpace: "pre-wrap", margin: 0 }}>{ticketDetail.ticket.description}</p>
                              </div>
                            )}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
                              <div style={{ fontFamily: "monospace", fontSize: 11 }}>
                                <span style={{ color: "#64748b" }}>Cuenta: </span>
                                <strong style={{ color: "#cbd5e1" }}>{ticketDetail.ticket.account?.companyName ?? "—"}</strong>
                                {ticketDetail.ticket.account?.phone && <span style={{ color: "#475569", marginLeft: 8 }}> · {ticketDetail.ticket.account.phone}</span>}
                              </div>
                              <div style={{ fontFamily: "monospace", fontSize: 11 }}>
                                <span style={{ color: "#64748b" }}>Contacto: </span>
                                <strong style={{ color: "#cbd5e1" }}>{ticketDetail.ticket.contact?.fullName ?? "—"}</strong>
                                {ticketDetail.ticket.contact?.email && <span style={{ color: "#475569", marginLeft: 8 }}> · {ticketDetail.ticket.contact.email}</span>}
                                {ticketDetail.ticket.contact?.phone && <span style={{ color: "#475569" }}> · {ticketDetail.ticket.contact.phone}</span>}
                                {!ticketDetail.ticket.contact?.fullName && !ticketDetail.ticket.contact?.email && !ticketDetail.ticket.contact?.phone && <span style={{ color: "#475569" }}>—</span>}
                              </div>
                              <div style={{ fontFamily: "monospace", fontSize: 11 }}>
                                <span style={{ color: "#64748b" }}>Técnico asignado: </span>
                                <span style={{ color: "#cbd5e1" }}>{ticketDetail.ticket.assignedResource?.fullName || ticketDetail.ticket.creatorResource?.fullName || ticketDetail.ticket.completedByResource?.fullName || "—"}</span>
                              </div>
                            </div>
                            {ticketDetail.ticket.resolution && (
                              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
                                <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, padding: "6px 10px", flexShrink: 0 }}>
                                  <span style={{ fontFamily: "monospace", fontSize: 9, color: "#22c55e", letterSpacing: 1 }}>✓ RESOLUCIÓN</span>
                                </div>
                                <p style={{ fontFamily: "monospace", fontSize: 12, color: "#94a3b8", lineHeight: 1.7, maxWidth: 700, margin: 0 }}>{ticketDetail.ticket.resolution}</p>
                              </div>
                            )}
                            {ticketDetail.suggestions?.length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#818cf8", letterSpacing: 1, marginBottom: 8 }}>SUGERENCIAS IA</div>
                                <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "monospace", fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                                  {ticketDetail.suggestions.map((s, idx) => (<li key={idx}>{s}</li>))}
                                </ul>
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                              <a href={`https://ww4.autotask.net/autotask/ServiceDesk/Ticket/TicketDetail.aspx?id=${ticketDetail.ticket.id}`} target="_blank" rel="noopener noreferrer" style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.2)", color: "#38bdf8", padding: "5px 12px", borderRadius: 5, fontFamily: "monospace", fontSize: 10, textDecoration: "none" }}>Ver en AutoTask →</a>
                              <a href="/ia-asistente" style={{ background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.2)", color: "#818cf8", padding: "5px 12px", borderRadius: 5, fontFamily: "monospace", fontSize: 10, textDecoration: "none" }}>Preguntar a IA →</a>
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div style={{ marginTop: 24, textAlign: "center", fontFamily: "monospace", fontSize: 9, color: "#1e3a5f", letterSpacing: 2 }}>
            HELPDEX v0.1.0 · MIS TICKETS · {tickets.length} en este período
          </div>
        </main>
      </div>
    </>
  );
}
