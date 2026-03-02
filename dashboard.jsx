import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

// ─── MOCK DATA (will be replaced by AutoTask + Datto RMM API calls) ─────────
const MOCK_METRICS = {
  avgResponseTime: "14m 32s",
  avgResponseDelta: -8.4,
  resolvedToday: 12,
  resolvedWeek: 58,
  resolvedMonth: 234,
  openTickets: 27,
  slaBreached: 2,
  slaDelta: +1,
  hoursToday: 6.5,
  hoursWeek: 31.2,
};

const RESPONSE_TIME_DATA = [
  { time: "08:00", minutes: 22, sla: 30 },
  { time: "09:00", minutes: 18, sla: 30 },
  { time: "10:00", minutes: 9,  sla: 30 },
  { time: "11:00", minutes: 14, sla: 30 },
  { time: "12:00", minutes: 28, sla: 30 },
  { time: "13:00", minutes: 11, sla: 30 },
  { time: "14:00", minutes: 7,  sla: 30 },
  { time: "15:00", minutes: 19, sla: 30 },
  { time: "16:00", minutes: 13, sla: 30 },
  { time: "NOW",   minutes: 6,  sla: 30 },
];

const WEEKLY_DATA = [
  { day: "Lun", resolved: 9,  open: 14 },
  { day: "Mar", resolved: 14, open: 11 },
  { day: "Mié", resolved: 7,  open: 18 },
  { day: "Jue", resolved: 16, open: 8  },
  { day: "Vie", resolved: 12, open: 6  },
  { day: "Sáb", resolved: 3,  open: 3  },
  { day: "HOY", resolved: 12, open: 27 },
];

const PATCH_DATA = [
  { name: "Workstations", compliant: 87, pending: 13, critical: 4 },
  { name: "Servers",      compliant: 94, pending: 6,  critical: 1 },
];

const RECENT_TICKETS = [
  {
    id: "T-8821",
    title: "VPN intermitente – usuario remoto no conecta",
    category: "Network",
    priority: "High",
    resolvedAt: "hace 23 min",
    hours: 1.2,
    tech: "AR",
    summary: "Se identificó conflicto de ruta en el cliente FortiClient. Se limpió caché de VPN y se actualizó perfil de conexión. Servicio restaurado sin necesidad de escalar.",
    status: "Complete",
  },
  {
    id: "T-8819",
    title: "Outlook no sincroniza buzón – Exchange Online",
    category: "M365",
    priority: "Medium",
    resolvedAt: "hace 1h 14m",
    hours: 0.8,
    tech: "AR",
    summary: "Perfil de Outlook corrupto. Se reconstruyó el perfil via Panel de Control, se reautenticó OAuth. Sincronización completa en 4 min.",
    status: "Complete",
  },
  {
    id: "T-8814",
    title: "Impresora de red no detectada tras migración de VLAN",
    category: "Network",
    priority: "High",
    resolvedAt: "hace 2h 45m",
    hours: 2.1,
    tech: "AR",
    summary: "La impresora quedó en VLAN 10 antigua. Se actualizó IP estática a rango VLAN 20, se ajustó puerto del switch. Redescubierta automáticamente por Windows.",
    status: "Complete",
  },
  {
    id: "T-8810",
    title: "Servidor de archivos sin espacio en disco – DRV-PROD-02",
    category: "Server",
    priority: "Critical",
    resolvedAt: "hace 4h 02m",
    hours: 3.4,
    tech: "AR",
    summary: "Logs de IIS consumieron 98% del volumen D:. Se rotaron y archivaron logs, se configuró tarea programada para limpieza automática semanal. Alerta en Datto RMM desactivada.",
    status: "Complete",
  },
  {
    id: "T-8807",
    title: "MFA no funciona en portal cliente – TOTP out of sync",
    category: "Security",
    priority: "Medium",
    resolvedAt: "hace 5h 30m",
    hours: 0.5,
    tech: "AR",
    summary: "Reloj del dispositivo móvil desfasado por 4 min. Se sincronizó tiempo NTP y se regeneró código TOTP desde portal admin. Acceso restaurado.",
    status: "Complete",
  },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
const priorityConfig = {
  Critical: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "CRÍTICO" },
  High:     { color: "#f97316", bg: "rgba(249,115,22,0.12)", label: "ALTO" },
  Medium:   { color: "#eab308", bg: "rgba(234,179,8,0.12)", label: "MEDIO" },
  Low:      { color: "#22c55e", bg: "rgba(34,197,94,0.12)", label: "BAJO" },
};

const categoryColor = {
  Network:  "#22d3ee",
  M365:     "#818cf8",
  Server:   "#fb923c",
  Security: "#ef4444",
  General:  "#94a3b8",
};

function Ticker({ value, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / 40;
    const interval = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(interval); }
      else setDisplay(Math.floor(start));
    }, 18);
    return () => clearInterval(interval);
  }, [value]);
  return <span>{display}{suffix}</span>;
}

function LiveDot() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: "#22c55e",
        boxShadow: "0 0 0 0 rgba(34,197,94,0.6)",
        animation: "pulse 1.8s infinite",
      }} />
      <span style={{ fontSize: 10, color: "#22c55e", letterSpacing: 1.5, fontFamily: "monospace" }}>LIVE</span>
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#0f172a", border: "1px solid #1e293b",
        padding: "10px 14px", borderRadius: 6, fontSize: 12,
        fontFamily: "monospace", color: "#cbd5e1",
      }}>
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

// ─── MAIN DASHBOARD ─────────────────────────────────────────────────────────
export default function Dashboard() {
  const [time, setTime] = useState(new Date());
  const [activeTicket, setActiveTicket] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (d) => d.toLocaleTimeString("es-DO", { hour12: false });
  const fmtDate = (d) => d.toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;700;800&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          background: #060b14;
          color: #cbd5e1;
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1525; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }

        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
          70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .card {
          background: #0a1628;
          border: 1px solid #1a2744;
          border-radius: 10px;
          animation: slideIn 0.4s ease forwards;
        }

        .card:hover {
          border-color: #0e4d91;
          transition: border-color 0.2s;
        }

        .metric-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 38px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -1px;
        }

        .label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #475569;
        }

        .delta-positive { color: #22c55e; }
        .delta-negative { color: #ef4444; }

        .ticket-row {
          border-bottom: 1px solid #0f1e35;
          transition: background 0.15s;
          cursor: pointer;
        }
        .ticket-row:hover { background: #0d1d36; }
        .ticket-row:last-child { border-bottom: none; }

        .badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          padding: 2px 7px;
          border-radius: 3px;
          text-transform: uppercase;
        }

        .section-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #1e4976;
          padding-bottom: 12px;
          border-bottom: 1px solid #0f1e35;
          margin-bottom: 16px;
        }

        .nav-item {
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.5px;
          color: #475569;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .nav-item:hover { background: #0d1d36; color: #94a3b8; }
        .nav-item.active { background: #0e2a4d; color: #38bdf8; border-left: 2px solid #0ea5e9; }

        .patch-bar {
          height: 6px;
          border-radius: 3px;
          background: #1a2744;
          overflow: hidden;
          position: relative;
        }

        .grid-bg {
          background-image: 
            linear-gradient(rgba(14,77,145,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14,77,145,0.05) 1px, transparent 1px);
          background-size: 32px 32px;
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{
          width: 220, background: "#06101e",
          borderRight: "1px solid #0f1e35",
          display: "flex", flexDirection: "column",
          padding: "24px 12px", gap: 4,
          position: "sticky", top: 0, height: "100vh",
          flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{ padding: "0 8px 28px" }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, fontWeight: 700,
              color: "#0ea5e9", letterSpacing: 1,
            }}>HELPDEX</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, color: "#1e3a5f", letterSpacing: 2, marginTop: 2,
            }}>OPERATIONS CENTER</div>
          </div>

          {/* Nav */}
          {[
            { icon: "▣", label: "Dashboard", active: true },
            { icon: "◈", label: "Mis Tickets" },
            { icon: "◉", label: "Parches" },
            { icon: "◎", label: "Dispositivos" },
            { icon: "⬡", label: "IA Asistente" },
            { icon: "◇", label: "Reportes" },
          ].map((item) => (
            <div key={item.label} className={`nav-item ${item.active ? "active" : ""}`}>
              <span style={{ fontSize: 14, opacity: 0.7 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}

          <div style={{ flex: 1 }} />

          {/* User */}
          <div style={{
            borderTop: "1px solid #0f1e35", paddingTop: 16, marginTop: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 13, color: "#fff", fontFamily: "monospace",
              }}>AR</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>Tech L2</div>
                <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace" }}>AutoTask · Datto</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }} className="grid-bg">

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>
                Dashboard Operacional
              </h1>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#334155", marginTop: 6 }}>
                {fmtDate(time)}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <LiveDot />
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 22, fontWeight: 700, color: "#0ea5e9",
                letterSpacing: 1,
              }}>{fmt(time)}</div>
              <button style={{
                background: "#0ea5e9", color: "#fff", border: "none",
                padding: "8px 16px", borderRadius: 6, cursor: "pointer",
                fontFamily: "monospace", fontSize: 11, fontWeight: 700,
                letterSpacing: 1,
              }}>↻ SYNC</button>
            </div>
          </div>

          {/* ── TOP METRICS ROW ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
            
            {/* Response Time */}
            <div className="card" style={{ padding: "20px 22px", gridColumn: "span 1" }}>
              <div className="label" style={{ marginBottom: 10 }}>Tiempo Resp. Avg</div>
              <div className="metric-value" style={{ color: "#22d3ee" }}>{MOCK_METRICS.avgResponseTime}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 11, color: "#22c55e", fontFamily: "monospace", fontWeight: 700 }}>
                  ▼ {Math.abs(MOCK_METRICS.avgResponseDelta)}%
                </span>
                <span style={{ fontSize: 10, color: "#334155" }}>vs ayer</span>
              </div>
            </div>

            {/* Resolved Today */}
            <div className="card" style={{ padding: "20px 22px" }}>
              <div className="label" style={{ marginBottom: 10 }}>Resueltos Hoy</div>
              <div className="metric-value" style={{ color: "#22c55e" }}>
                <Ticker value={MOCK_METRICS.resolvedToday} />
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#334155", marginTop: 10 }}>
                /{MOCK_METRICS.resolvedWeek} esta semana
              </div>
            </div>

            {/* Open Tickets */}
            <div className="card" style={{ padding: "20px 22px" }}>
              <div className="label" style={{ marginBottom: 10 }}>Tickets Abiertos</div>
              <div className="metric-value" style={{ color: "#f97316" }}>
                <Ticker value={MOCK_METRICS.openTickets} />
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#334155", marginTop: 10 }}>
                AutoTask · en vivo
              </div>
            </div>

            {/* SLA Breach */}
            <div className="card" style={{ padding: "20px 22px", borderColor: MOCK_METRICS.slaBreached > 0 ? "#3b1a1a" : "#1a2744" }}>
              <div className="label" style={{ marginBottom: 10 }}>SLA Breach</div>
              <div className="metric-value" style={{ color: MOCK_METRICS.slaBreached > 0 ? "#ef4444" : "#22c55e" }}>
                <Ticker value={MOCK_METRICS.slaBreached} />
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#334155", marginTop: 10 }}>
                {MOCK_METRICS.slaBreached > 0 ? "⚠ Requiere atención" : "✓ Dentro del SLA"}
              </div>
            </div>

            {/* Hours Today */}
            <div className="card" style={{ padding: "20px 22px" }}>
              <div className="label" style={{ marginBottom: 10 }}>Horas Trabajadas</div>
              <div className="metric-value" style={{ color: "#818cf8" }}>
                {MOCK_METRICS.hoursToday}
                <span style={{ fontSize: 16, fontWeight: 400, color: "#475569" }}>h</span>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#334155", marginTop: 10 }}>
                {MOCK_METRICS.hoursWeek}h esta semana
              </div>
            </div>
          </div>

          {/* ── CHARTS ROW ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 24 }}>

            {/* Response Time Chart */}
            <div className="card" style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div className="section-title" style={{ marginBottom: 4, paddingBottom: 0, borderBottom: "none" }}>
                    TIEMPO DE RESPUESTA — HOY
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "#1e4976" }}>vs umbral SLA (30 min)</div>
                </div>
                <LiveDot />
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={RESPONSE_TIME_DATA}>
                  <defs>
                    <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#0f1e35" strokeDasharray="4 4" />
                  <XAxis dataKey="time" tick={{ fill: "#334155", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#334155", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} unit="m" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line dataKey="sla" stroke="#ef4444" strokeWidth={1} strokeDasharray="6 3" dot={false} name="SLA" />
                  <Area dataKey="minutes" stroke="#22d3ee" strokeWidth={2} fill="url(#gradCyan)" dot={{ fill: "#22d3ee", r: 3 }} name="minutes" activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Weekly Bar Chart */}
            <div className="card" style={{ padding: "22px 24px" }}>
              <div className="section-title">TICKETS — SEMANA ACTUAL</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={WEEKLY_DATA} barGap={4}>
                  <CartesianGrid stroke="#0f1e35" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#334155", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#334155", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="resolved" fill="#22c55e" radius={[3, 3, 0, 0]} name="resolved" opacity={0.85} />
                  <Bar dataKey="open" fill="#f97316" radius={[3, 3, 0, 0]} name="open" opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: "#22c55e" }} />
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "#475569" }}>Resueltos</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: "#f97316" }} />
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "#475569" }}>Abiertos</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── PATCH STATUS + MONTH METRIC ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 24 }}>

            {/* Monthly Summary */}
            <div className="card" style={{ padding: "22px 24px" }}>
              <div className="section-title">RESUMEN MENSUAL</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {[
                  { label: "Tickets resueltos", value: MOCK_METRICS.resolvedMonth, color: "#22c55e", suffix: "" },
                  { label: "Horas facturadas", value: 142, color: "#818cf8", suffix: "h" },
                  { label: "SLA cumplido", value: 97, color: "#22d3ee", suffix: "%" },
                ].map((m) => (
                  <div key={m.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#475569" }}>{m.label}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: m.color }}>
                        {m.value}{m.suffix}
                      </span>
                    </div>
                    <div className="patch-bar">
                      <div style={{
                        height: "100%",
                        width: `${Math.min((m.value / (m.suffix === "%" ? 100 : m.suffix === "h" ? 200 : 300)) * 100, 100)}%`,
                        background: m.color, opacity: 0.8, borderRadius: 3,
                        transition: "width 1s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Patch Status */}
            <div className="card" style={{ padding: "22px 24px" }}>
              <div className="section-title">ESTADO DE PARCHES — DATTO RMM</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {PATCH_DATA.map((p) => (
                  <div key={p.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>{p.name}</span>
                      {p.critical > 0 && (
                        <span className="badge" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                          {p.critical} CRÍTICO
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: "#22c55e" }}>{p.compliant}%</div>
                        <div className="label" style={{ marginTop: 2 }}>Compliant</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: "#f97316" }}>{p.pending}%</div>
                        <div className="label" style={{ marginTop: 2 }}>Pendientes</div>
                      </div>
                    </div>
                    {/* Stacked bar */}
                    <div style={{ height: 8, borderRadius: 4, overflow: "hidden", background: "#1a2744", display: "flex" }}>
                      <div style={{ width: `${p.compliant}%`, background: "#22c55e", opacity: 0.8 }} />
                      <div style={{ width: `${p.pending - p.critical}%`, background: "#f97316", opacity: 0.7 }} />
                      <div style={{ width: `${p.critical}%`, background: "#ef4444" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#22c55e" }}>OK</span>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#f97316" }}>PENDING</span>
                      <span style={{ fontFamily: "monospace", fontSize: 9, color: "#ef4444" }}>CRITICAL</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RECENT TICKETS ── */}
          <div className="card" style={{ padding: "22px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div className="section-title" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
                TICKETS RESUELTOS — ÚLTIMAS 24H
              </div>
              <button style={{
                background: "transparent", border: "1px solid #1a2744",
                color: "#475569", padding: "5px 12px", borderRadius: 5,
                fontFamily: "monospace", fontSize: 10, cursor: "pointer",
                letterSpacing: 1,
              }}>VER TODOS →</button>
            </div>
            <div style={{ borderBottom: "1px solid #0f1e35", marginBottom: 16 }} />

            {/* Table Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 90px 70px 80px 80px",
              gap: 12, padding: "0 16px 10px",
            }}>
              {["TICKET", "TÍTULO / CATEGORÍA", "PRIORIDAD", "RESUELTO", "HORAS", "TECH"].map((h) => (
                <div key={h} className="label">{h}</div>
              ))}
            </div>

            {RECENT_TICKETS.map((t, i) => (
              <div key={t.id} style={{ animationDelay: `${i * 0.05}s` }}>
                <div
                  className="ticket-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 90px 70px 80px 80px",
                    gap: 12, padding: "14px 16px", alignItems: "center",
                  }}
                  onClick={() => setActiveTicket(activeTicket === t.id ? null : t.id)}
                >
                  {/* ID */}
                  <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#0ea5e9" }}>
                    {t.id}
                  </div>

                  {/* Title + Category */}
                  <div>
                    <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600, marginBottom: 4, lineClamp: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 340 }}>
                      {t.title}
                    </div>
                    <span className="badge" style={{
                      background: `${categoryColor[t.category]}18`,
                      color: categoryColor[t.category],
                    }}>{t.category}</span>
                  </div>

                  {/* Priority */}
                  <div>
                    <span className="badge" style={{
                      background: priorityConfig[t.priority].bg,
                      color: priorityConfig[t.priority].color,
                    }}>{priorityConfig[t.priority].label}</span>
                  </div>

                  {/* Resolved At */}
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: "#475569" }}>
                    {t.resolvedAt}
                  </div>

                  {/* Hours */}
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: "#818cf8" }}>
                    {t.hours}h
                  </div>

                  {/* Tech */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 10, color: "#fff", fontFamily: "monospace",
                    }}>{t.tech}</div>
                  </div>
                </div>

                {/* Expandable Summary */}
                {activeTicket === t.id && (
                  <div style={{
                    background: "#0d1d36", borderTop: "1px solid #0f1e35",
                    borderBottom: "1px solid #0f1e35",
                    padding: "16px 20px",
                    animation: "slideIn 0.2s ease",
                  }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{
                        background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)",
                        borderRadius: 6, padding: "6px 10px", flexShrink: 0,
                      }}>
                        <span style={{ fontFamily: "monospace", fontSize: 9, color: "#22c55e", letterSpacing: 1 }}>✓ RESOLUCIÓN</span>
                      </div>
                      <p style={{
                        fontFamily: "monospace", fontSize: 12, color: "#94a3b8",
                        lineHeight: 1.7, maxWidth: 700,
                      }}>
                        {t.summary}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                      <button style={{
                        background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.2)",
                        color: "#38bdf8", padding: "5px 12px", borderRadius: 5,
                        fontFamily: "monospace", fontSize: 10, cursor: "pointer",
                      }}>Ver en AutoTask →</button>
                      <button style={{
                        background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.2)",
                        color: "#818cf8", padding: "5px 12px", borderRadius: 5,
                        fontFamily: "monospace", fontSize: 10, cursor: "pointer",
                      }}>Preguntar a IA →</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 24, textAlign: "center",
            fontFamily: "monospace", fontSize: 9, color: "#1e3a5f", letterSpacing: 2,
          }}>
            HELPDEX v0.1.0 · AUTOTASK CONNECTED · DATTO RMM CONNECTED · LAST SYNC 00:43s AGO
          </div>
        </main>
      </div>
    </>
  );
}
