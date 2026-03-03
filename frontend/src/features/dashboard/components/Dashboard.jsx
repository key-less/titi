/**
 * Dashboard HELPDEX — Operaciones Center
 * Datos desde AutoTask y Datto RMM (APIs). Sin datos predefinidos.
 */
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTickets } from "../../tickets/hooks/useTickets";
import { useTicketWithSuggestions } from "../../tickets/hooks/useTicketWithSuggestions";
import { usePatches } from "../../patches/hooks/usePatches";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";
import { fetchResources, fetchTicketStatus } from "../../tickets/api/ticketsApi";

// Helper: formatea fecha para "Resuelto" / "Última actividad"
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

const categoryColor = {
  Network: "#22d3ee",
  M365: "#818cf8",
  Server: "#fb923c",
  Security: "#ef4444",
  General: "#94a3b8",
};

function Ticker({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / 40;
    const interval = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else setDisplay(Math.floor(start));
    }, 18);
    return () => clearInterval(interval);
  }, [value]);
  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

function LiveDot() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "#22c55e",
          boxShadow: "0 0 0 0 rgba(34,197,94,0.6)",
          animation: "pulse 1.8s infinite",
        }}
      />
      <span style={{ fontSize: 10, color: "#22c55e", letterSpacing: 1.5, fontFamily: "monospace" }}>
        LIVE
      </span>
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          padding: "10px 14px",
          borderRadius: 6,
          fontSize: 12,
          fontFamily: "monospace",
          color: "#cbd5e1",
        }}
      >
        <div style={{ color: "#64748b", marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>
            {p.name}: <strong>{p.value}{p.name === "minutes" ? "m" : ""}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const statusColor = {
  "New": "#22d3ee",
  "In Progress": "#0ea5e9",
  "Complete": "#22c55e",
  "Waiting Customer": "#f97316",
  "Waiting Vendor": "#eab308",
  "Work Complete": "#22c55e",
};

export function Dashboard() {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [activeTicket, setActiveTicket] = useState(null);
  const [soloAbiertos, setSoloAbiertos] = useState(true);
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [resources, setResources] = useState([]);
  const [myResourceId, setMyResourceId] = useState(null);

  const assignedResourceId =
    assignedToFilter === "" ? undefined : assignedToFilter === "me" ? "me" : Number(assignedToFilter);
  const { tickets, loading: ticketsLoading, error: ticketsError, apiMessage, backendUnavailable, refetch: refetchTickets } = useTickets({
    limit: 100,
    openOnly: soloAbiertos,
    assignedResourceId,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusData, list] = await Promise.all([fetchTicketStatus(), fetchResources()]);
        if (!cancelled) {
          if (statusData?.my_resource_id != null) setMyResourceId(statusData.my_resource_id);
          if (Array.isArray(list)) setResources(list);
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);
  const { data: ticketDetail, loading: detailLoading, error: detailError, loadTicket: loadTicketDetail, clear: clearDetail } = useTicketWithSuggestions();
  const { patches: patchData } = usePatches();
  const { tickets: metricsTickets, patches: metricsPatches, slaBreached: metricsSlaBreached, generatedAt: metricsGeneratedAt, refetch: refetchMetrics } = useDashboardMetrics({ refetchIntervalMs: 60000 });

  const openTicketsCount = metricsTickets.openTickets ?? 0;
  const resolvedTodayCount = metricsTickets.resolvedToday ?? 0;
  const resolvedWeekCount = metricsTickets.resolvedWeek ?? 0;
  const resolvedMonthCount = metricsTickets.resolvedMonth ?? 0;
  const weeklyChartData = Array.isArray(metricsTickets.weeklyChart) && metricsTickets.weeklyChart.length > 0
    ? metricsTickets.weeklyChart
    : [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { day: d.toLocaleDateString("es", { weekday: "short" }), resolved: 0, open: 0 };
      });
  const responseTimeChartData = Array.isArray(metricsTickets.responseTimeChart) && metricsTickets.responseTimeChart.length > 0
    ? metricsTickets.responseTimeChart
    : [];
  const avgResponseMinutes = responseTimeChartData.length > 0
    ? Math.round(responseTimeChartData.reduce((s, d) => s + (d.minutes || 0), 0) / responseTimeChartData.length)
    : null;

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (activeTicket) loadTicketDetail(activeTicket);
    else clearDetail();
  }, [activeTicket, loadTicketDetail, clearDetail]);

  const fmt = (d) => d.toLocaleTimeString("es-DO", { hour12: false });
  const fmtDate = (d) =>
    d.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <style>{`
        .helpdex-card { background: #0a1628; border: 1px solid #1a2744; border-radius: 10px; animation: slideIn 0.4s ease forwards; }
        .helpdex-card:hover { border-color: #0e4d91; transition: border-color 0.2s; }
        .metric-value { font-family: 'JetBrains Mono', monospace; font-size: 38px; font-weight: 700; line-height: 1; letter-spacing: -1px; }
        .helpdex-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #475569; }
        .ticket-row { border-bottom: 1px solid #0f1e35; transition: background 0.15s; cursor: pointer; }
        .ticket-row:hover { background: #0d1d36; }
        .ticket-row:last-child { border-bottom: none; }
        .helpdex-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; padding: 2px 7px; border-radius: 3px; text-transform: uppercase; }
        .section-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #1e4976; padding-bottom: 12px; border-bottom: 1px solid #0f1e35; margin-bottom: 16px; }
        .nav-item { padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px; color: #475569; transition: all 0.15s; display: flex; align-items: center; gap: 10px; }
        .nav-item:hover { background: #0d1d36; color: #94a3b8; }
        .nav-item.active { background: #0e2a4d; color: #38bdf8; border-left: 2px solid #0ea5e9; }
        .patch-bar { height: 6px; border-radius: 3px; background: #1a2744; overflow: hidden; }
        .grid-bg { background-image: linear-gradient(rgba(14,77,145,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,77,145,0.05) 1px, transparent 1px); background-size: 32px 32px; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); } 70% { box-shadow: 0 0 0 6px rgba(34,197,94,0); } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
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
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                fontWeight: 700,
                color: "#0ea5e9",
                letterSpacing: 1,
              }}
            >
              HELPDEX
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: "#1e3a5f",
                letterSpacing: 2,
                marginTop: 2,
              }}
            >
              OPERATIONS CENTER
            </div>
          </div>
          {[
            { icon: "▣", label: "Dashboard", path: "/" },
            { icon: "◈", label: "Mis Tickets", path: "/mis-tickets" },
            { icon: "◉", label: "Parches", path: "/parches" },
            { icon: "◎", label: "Dispositivos", path: "/dispositivos" },
            { icon: "⬡", label: "IA Asistente", path: "/ia-asistente" },
            { icon: "◇", label: "Reportes", path: "/reportes" },
          ].map((item) => {
            const isActive = item.path ? location.pathname === item.path || (item.path === "/" && (location.pathname === "/" || location.pathname === "/dashboard")) : false;
            const content = (
              <>
                <span style={{ fontSize: 14, opacity: 0.7 }}>{item.icon}</span>
                {item.label}
              </>
            );
            return item.path ? (
              <Link key={item.label} to={item.path} className={`nav-item ${isActive ? "active" : ""}`} style={{ textDecoration: "none", color: "inherit" }}>
                {content}
              </Link>
            ) : (
              <div key={item.label} className="nav-item" style={{ opacity: 0.6, cursor: "not-allowed" }} title="Próximamente">
                {content}
              </div>
            );
          })}
          <div style={{ flex: 1 }} />
          <div style={{ borderTop: "1px solid #0f1e35", paddingTop: 16, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#fff",
                  fontFamily: "monospace",
                }}
              >
                AR
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Tech L2</div>
                <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace" }}>
                  AutoTask · Datto
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main
          style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}
          className="grid-bg"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 32,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#f1f5f9",
                  lineHeight: 1,
                }}
              >
                Dashboard Operacional
              </h1>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#334155", marginTop: 6 }}>
                {fmtDate(time)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <LiveDot />
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#0ea5e9",
                  letterSpacing: 1,
                }}
              >
                {fmt(time)}
              </div>
              <button
                onClick={() => { refetchTickets(); refetchMetrics(); }}
                style={{
                  background: "#0ea5e9",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                ↻ SYNC
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div className="helpdex-card" style={{ padding: "20px 22px" }}>
              <div className="helpdex-label" style={{ marginBottom: 10 }}>Tiempo resolución (avg)</div>
              <div className="metric-value" style={{ color: "#22d3ee" }}>
                {avgResponseMinutes != null ? `${avgResponseMinutes}m` : "—"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>
                  {avgResponseMinutes != null ? "Últimos 7 días · AutoTask" : "Resueltos esta semana"}
                </span>
              </div>
            </div>
            <div className="helpdex-card" style={{ padding: "20px 22px" }}>
              <div className="helpdex-label" style={{ marginBottom: 10 }}>Resueltos Hoy</div>
              <div className="metric-value" style={{ color: "#22c55e" }}>
                <Ticker value={resolvedTodayCount} />
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#334155", marginTop: 10 }}>
                /{resolvedWeekCount} esta semana · AutoTask
              </div>
            </div>
            <div className="helpdex-card" style={{ padding: "20px 22px" }}>
              <div className="helpdex-label" style={{ marginBottom: 10 }}>Tickets Abiertos</div>
              <div className="metric-value" style={{ color: "#f97316" }}>
                <Ticker value={openTicketsCount} />
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#334155", marginTop: 10 }}>
                AutoTask · en vivo
              </div>
            </div>
            <div
              className="helpdex-card"
              style={{
                padding: "20px 22px",
                borderColor: (metricsSlaBreached ?? 0) > 0 ? "#3b1a1a" : "#1a2744",
              }}
            >
              <div className="helpdex-label" style={{ marginBottom: 10 }}>SLA Breach</div>
              <div
                className="metric-value"
                style={{ color: (metricsSlaBreached ?? 0) > 0 ? "#ef4444" : "#22c55e" }}
              >
                <Ticker value={metricsSlaBreached ?? 0} />
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#334155", marginTop: 10 }}>
                {(metricsSlaBreached ?? 0) > 0 ? "⚠ Requiere atención" : "✓ Dentro del SLA"}
              </div>
            </div>
            <div className="helpdex-card" style={{ padding: "20px 22px" }}>
              <div className="helpdex-label" style={{ marginBottom: 10 }}>Dispositivos RMM</div>
              <div className="metric-value" style={{ color: "#818cf8" }}>
                <Ticker value={metricsPatches?.devicesTotal ?? 0} />
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#334155", marginTop: 10 }}>
                Datto RMM · total cuenta
              </div>
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 24 }}
          >
            <div className="helpdex-card" style={{ padding: "22px 24px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div>
                  <div
                    className="section-title"
                    style={{ marginBottom: 4, paddingBottom: 0, borderBottom: "none" }}
                  >
                    TIEMPO DE RESOLUCIÓN — ÚLTIMOS 7 DÍAS
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "#1e4976" }}>
                    Promedio minutos (creación → cierre) · línea roja = SLA 30 min
                  </div>
                </div>
                <LiveDot />
              </div>
              <div style={{ position: "relative", width: "100%", height: 180 }}>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={responseTimeChartData}>
                  <defs>
                    <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#0f1e35" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#334155", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#334155", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                    unit="m"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    dataKey="sla"
                    stroke="#ef4444"
                    strokeWidth={1}
                    strokeDasharray="6 3"
                    dot={false}
                    name="SLA (min)"
                  />
                  <Area
                    dataKey="minutes"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    fill="url(#gradCyan)"
                    dot={{ fill: "#22d3ee", r: 3 }}
                    name="minutes"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
                {responseTimeChartData.length === 0 && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 11, color: "#475569", pointerEvents: "none" }}>
                    Sin datos (resueltos esta semana)
                  </div>
                )}
              </div>
            </div>
            <div className="helpdex-card" style={{ padding: "22px 24px" }}>
              <div className="section-title">TICKETS — SEMANA ACTUAL</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyChartData} barGap={4}>
                  <CartesianGrid stroke="#0f1e35" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "#334155", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#334155", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="resolved" fill="#22c55e" radius={[3, 3, 0, 0]} name="resolved" opacity={0.85} />
                  <Bar dataKey="open" fill="#f97316" radius={[3, 3, 0, 0]} name="open" opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: "#22c55e",
                    }}
                  />
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "#475569" }}>
                    Resueltos
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: "#f97316",
                    }}
                  />
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "#475569" }}>
                    Abiertos
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 24 }}
          >
            <div className="helpdex-card" style={{ padding: "22px 24px" }}>
              <div className="section-title">RESUMEN MENSUAL</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {[
                  { label: "Tickets resueltos", value: resolvedMonthCount, color: "#22c55e", suffix: "", max: Math.max(resolvedMonthCount, 50) },
                  { label: "Horas facturadas", value: "—", color: "#818cf8", suffix: "h", max: 1 },
                  { label: "SLA cumplido", value: "—", color: "#22d3ee", suffix: "%", max: 1 },
                ].map((m) => (
                  <div key={m.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#475569" }}>
                        {m.label}
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 14,
                          fontWeight: 700,
                          color: m.color,
                        }}
                      >
                        {typeof m.value === "number" ? m.value + m.suffix : m.value}
                      </span>
                    </div>
                    <div className="patch-bar">
                      <div
                        style={{
                          height: "100%",
                          width: `${typeof m.value === "number" && m.max > 0 ? Math.min((m.value / m.max) * 100, 100) : 0}%`,
                          background: m.color,
                          opacity: 0.8,
                          borderRadius: 3,
                          transition: "width 1s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="helpdex-card" style={{ padding: "22px 24px" }}>
              <div className="section-title">ESTADO DE PARCHES — DATTO RMM</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {patchData.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "24px 16px", fontFamily: "monospace", fontSize: 11, color: "#475569" }}>
                    Sin datos — conectar API Datto RMM
                  </div>
                ) : patchData.map((p) => (
                  <div key={p.name}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#94a3b8",
                        }}
                      >
                        {p.name}
                      </span>
                      {p.critical > 0 && (
                        <span
                          className="helpdex-badge"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                        >
                          {p.critical} CRÍTICO
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 22,
                            fontWeight: 700,
                            color: "#22c55e",
                          }}
                        >
                          {p.compliant}%
                        </div>
                        <div className="helpdex-label" style={{ marginTop: 2 }}>Compliant</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 22,
                            fontWeight: 700,
                            color: "#f97316",
                          }}
                        >
                          {p.pending}%
                        </div>
                        <div className="helpdex-label" style={{ marginTop: 2 }}>Pendientes</div>
                      </div>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        overflow: "hidden",
                        background: "#1a2744",
                        display: "flex",
                      }}
                    >
                      <div style={{ width: `${p.compliant}%`, background: "#22c55e", opacity: 0.8 }} />
                      <div
                        style={{
                          width: `${Math.max(0, (p.pending ?? 0) - (p.critical ?? 0))}%`,
                          background: "#f97316",
                          opacity: 0.7,
                        }}
                      />
                      <div style={{ width: `${p.critical}%`, background: "#ef4444" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#22c55e" }}>OK</span>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#f97316" }}>
                        PENDING
                      </span>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#ef4444" }}>
                        CRITICAL
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="helpdex-card" style={{ padding: "22px 24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <div
                className="section-title"
                style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}
              >
                {soloAbiertos ? 'TICKETS ABIERTOS' : 'MIS TICKETS (HISTORIAL)'} — AUTOTASK
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Link
                  to="/mis-tickets"
                  style={{
                    background: "transparent",
                    border: "1px solid #1a2744",
                    color: "#475569",
                    padding: "5px 12px",
                    borderRadius: 5,
                    fontFamily: "monospace",
                    fontSize: 10,
                    letterSpacing: 1,
                    textDecoration: "none",
                  }}
                >
                  VER TODOS →
                </Link>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", fontSize: 10, color: "#475569", letterSpacing: 1 }}>
                  Asignado a:
                  <select
                    value={assignedToFilter}
                    onChange={(e) => setAssignedToFilter(e.target.value)}
                    style={{
                      background: "#0a1628",
                      border: "1px solid #1a2744",
                      color: "#cbd5e1",
                      padding: "5px 10px",
                      borderRadius: 5,
                      fontFamily: "monospace",
                      fontSize: 11,
                      cursor: "pointer",
                      minWidth: 140,
                    }}
                  >
                    <option value="">Todos</option>
                    {myResourceId != null && <option value="me">Yo</option>}
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                {!soloAbiertos && (
                  <button
                    type="button"
                    onClick={() => setSoloAbiertos(true)}
                    style={{ padding: "5px 10px", background: "rgba(14,165,233,0.12)", border: "1px solid #1a2744", color: "#38bdf8", borderRadius: 5, fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}
                  >
                    Solo abiertos
                  </button>
                )}
                <button
                  onClick={() => refetchTickets()}
                  style={{
                    background: "transparent",
                    border: "1px solid #1a2744",
                    color: "#475569",
                    padding: "5px 12px",
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
            <div style={{ borderBottom: "1px solid #0f1e35", marginBottom: 16 }} />
            {backendUnavailable && (
              <div style={{ padding: "12px 16px", background: "rgba(249,115,22,0.12)", borderRadius: 6, marginBottom: 12, fontFamily: "monospace", fontSize: 12, color: "#f97316" }}>
                Backend no disponible (conexión rechazada). Inicia el backend con <strong>php artisan serve</strong> en la carpeta backend.
              </div>
            )}
            {apiMessage && !backendUnavailable && (
              <div style={{ padding: "12px 16px", background: "rgba(14,165,233,0.12)", borderRadius: 6, marginBottom: 12, fontFamily: "monospace", fontSize: 12, color: "#38bdf8" }}>
                {apiMessage}
              </div>
            )}
            {ticketsError && !backendUnavailable && !apiMessage && (
              <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", borderRadius: 6, marginBottom: 12, fontFamily: "monospace", fontSize: 12, color: "#ef4444" }}>
                {ticketsError}
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 100px 90px 70px 80px",
                gap: 12,
                padding: "0 16px 10px",
              }}
            >
              {["TICKET", "TÍTULO / ESTATUS", "PRIORIDAD", "ESTADO", "ACTIVIDAD", "TECH"].map((h) => (
                <div key={h} className="helpdex-label">
                  {h}
                </div>
              ))}
            </div>
            {ticketsLoading ? (
              <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontFamily: "monospace", fontSize: 12 }}>Cargando tickets…</div>
            ) : tickets.length === 0 && !backendUnavailable ? (
              <div style={{ padding: 32, textAlign: "center", color: "#64748b", fontFamily: "monospace", fontSize: 13, borderTop: "1px solid #0f1e35" }}>
                {soloAbiertos ? 'No hay tickets abiertos en este momento.' : 'No hay tickets que mostrar.'}
                {apiMessage && <div style={{ marginTop: 10, color: "#38bdf8", fontSize: 12 }}>{apiMessage}</div>}
                {soloAbiertos && (
                  <button
                    type="button"
                    onClick={() => setSoloAbiertos(false)}
                    style={{ marginTop: 14, padding: "8px 16px", background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)", color: "#38bdf8", borderRadius: 6, fontFamily: "monospace", fontSize: 11, cursor: "pointer" }}
                  >
                    Ver todos los tickets (historial)
                  </button>
                )}
              </div>
            ) : (
              tickets.map((t, i) => {
                const statusLbl = t.statusLabel || t.status || "—";
                const priorityLbl = (priorityConfig[t.priorityLabel] && priorityConfig[t.priorityLabel].label) ? priorityConfig[t.priorityLabel].label : (t.priorityLabel || "—");
                const priorityStyle = priorityConfig[t.priorityLabel] || { bg: "rgba(148,163,184,0.12)", color: "#94a3b8" };
                const statusStyle = statusColor[statusLbl] || "#94a3b8";
                return (
                  <div key={t.id} style={{ animationDelay: `${i * 0.05}s` }}>
                    <div
                      className="ticket-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "100px 1fr 100px 90px 70px 80px",
                        gap: 12,
                        padding: "14px 16px",
                        alignItems: "center",
                      }}
                      onClick={() => setActiveTicket(activeTicket === t.id ? null : t.id)}
                    >
                      <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#0ea5e9" }}>
                        {t.ticketNumber || t.id}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600, marginBottom: 4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 340 }}>
                          {t.title}
                        </div>
                        <span className="helpdex-badge" style={{ background: `${statusStyle}18`, color: statusStyle }}>
                          {statusLbl}
                        </span>
                      </div>
                      <div>
                        <span className="helpdex-badge" style={{ background: priorityStyle.bg, color: priorityStyle.color }}>
                          {priorityLbl}
                        </span>
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: "#475569" }} title="Última actividad">
                        {formatRelative(t.completedDate || t.lastActivityDate)}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>
                        {t.estimatedHours != null ? `${Number(t.estimatedHours)}h` : "—"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {t.assignedResource ? (
                          <div title={t.assignedResource.fullName} style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 10, color: "#fff", fontFamily: "monospace" }}>
                            {t.assignedResource.initials || "—"}
                          </div>
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
                                  {ticketDetail.suggestions.map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                              <Link to={`/mis-tickets?ticket=${ticketDetail.ticket.id}`} style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", padding: "5px 12px", borderRadius: 5, fontFamily: "monospace", fontSize: 10, textDecoration: "none" }}>
                                Ver detalle en Mis Tickets →
                              </Link>
                              <a href={`https://ww4.autotask.net/autotask/ServiceDesk/Ticket/TicketDetail.aspx?id=${ticketDetail.ticket.id}`} target="_blank" rel="noopener noreferrer" style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.2)", color: "#38bdf8", padding: "5px 12px", borderRadius: 5, fontFamily: "monospace", fontSize: 10, textDecoration: "none" }}>
                                Ver en AutoTask →
                              </a>
                              <Link to="/ia-asistente" style={{ background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.2)", color: "#818cf8", padding: "5px 12px", borderRadius: 5, fontFamily: "monospace", fontSize: 10, textDecoration: "none" }}>
                                Preguntar a IA →
                              </Link>
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

          <div
            style={{
              marginTop: 24,
              textAlign: "center",
              fontFamily: "monospace",
              fontSize: 9,
              color: "#1e3a5f",
              letterSpacing: 2,
            }}
          >
            HELPDEX v0.1.0 · AUTOTASK · DATTO RMM · Última actualización métricas: {metricsGeneratedAt ? new Date(metricsGeneratedAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
          </div>
        </main>
      </div>
    </>
  );
}
