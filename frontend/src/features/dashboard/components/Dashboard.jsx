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
  Normal: { color: "#3b82f6", bg: "rgba(59,130,246,0.15)", label: "Normal", textClass: "text-blue-500", bgClass: "bg-blue-500/15" },
  Media: { color: "#22c55e", bg: "rgba(34,197,94,0.15)", label: "Media", textClass: "text-green-500", bgClass: "bg-green-500/15" },
  Alta: { color: "#eab308", bg: "rgba(234,179,8,0.15)", label: "Alta", textClass: "text-yellow-500", bgClass: "bg-yellow-500/15" },
  Critica: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", label: "Crítica", textClass: "text-red-500", bgClass: "bg-red-500/15" },
};

const statusColorClasses = {
  "New": "text-cyan-400 bg-cyan-400/15",
  "In Progress": "text-blue-400 bg-blue-400/15",
  "Complete": "text-green-500 bg-green-500/15",
  "Waiting Customer": "text-orange-500 bg-orange-500/15",
  "Waiting Vendor": "text-yellow-500 bg-yellow-500/15",
  "Work Complete": "text-green-500 bg-green-500/15",
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
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_0_rgba(34,197,94,0.6)] animate-[pulse_1.8s_infinite]" />
      <span className="text-[10px] text-green-500 tracking-[1.5px] font-mono">LIVE</span>
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border px-3 py-2 rounded-md text-xs font-mono text-foreground shadow-lg">
        <div className="text-muted-foreground mb-1">{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>
            {p.name}: <strong className="font-bold">{p.value}{p.name === "minutes" ? "m" : ""}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [activeTicket, setActiveTicket] = useState(null);
  const [soloAbiertos, setSoloAbiertos] = useState(true);
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [resources, setResources] = useState([]);
  const [myResourceId, setMyResourceId] = useState(null);
  const [autotaskTicketDetailUrl, setAutotaskTicketDetailUrl] = useState("");

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
          if (typeof statusData?.autotask_ticket_detail_url === "string") setAutotaskTicketDetailUrl(statusData.autotask_ticket_detail_url);
          if (Array.isArray(list)) setResources(list);
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  const { data: ticketDetail, loading: detailLoading, error: detailError, loadTicket: loadTicketDetail, clear: clearDetail } = useTicketWithSuggestions();
  const { patches: patchData, devices: patchDevices } = usePatches();
  const { tickets: metricsTickets, patches: metricsPatches, slaBreached: metricsSlaBreached, generatedAt: metricsGeneratedAt, refetch: refetchMetrics } = useDashboardMetrics({ refetchIntervalMs: 60 * 1000 });

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

  const slaWeekData = responseTimeChartData.filter((d) => d.minutes > 0);
  const slaWeekPercent = slaWeekData.length > 0
    ? Math.round((slaWeekData.filter((d) => d.minutes <= (d.sla || 30)).length / slaWeekData.length) * 100)
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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-[220px] bg-card/50 border-r border-border flex flex-col py-6 px-3 gap-1 sticky top-0 h-screen shrink-0 backdrop-blur-md">
        <div className="px-2 pb-6">
          <div className="font-mono text-sm font-bold text-primary tracking-wide">
            HELPDEX
          </div>
          <div className="font-mono text-[9px] text-muted-foreground tracking-[2px] mt-0.5">
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
              <span className="text-sm opacity-70">{item.icon}</span>
              {item.label}
            </>
          );
          return item.path ? (
            <Link 
              key={item.label} 
              to={item.path} 
              className={`px-3 py-2 rounded-md cursor-pointer text-xs font-mono tracking-wide transition-all duration-200 flex items-center gap-2.5 ${isActive ? "bg-primary/10 text-primary border-l-2 border-primary shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {content}
            </Link>
          ) : (
            <div key={item.label} className="px-3 py-2 rounded-md text-xs font-mono tracking-wide text-muted-foreground/60 flex items-center gap-2.5 cursor-not-allowed" title="Próximamente">
              {content}
            </div>
          );
        })}
        
        <div className="flex-1" />
        <div className="border-t border-border pt-4 mt-2">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center font-bold text-xs text-white font-mono shadow-md">
              AR
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground/80">Tech L2</div>
              <div className="text-[10px] text-muted-foreground font-mono">AutoTask · Datto</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:32px_32px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="font-sans text-[26px] font-extrabold text-white leading-none">
              Dashboard Operacional
            </h1>
            <div className="font-mono text-[11px] text-muted-foreground mt-1.5">
              {fmtDate(time)}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <LiveDot />
            <div className="font-mono text-2xl font-bold text-primary tracking-wide">
              {fmt(time)}
            </div>
            <button
              onClick={() => { refetchTickets(); refetchMetrics(); }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground border-none px-4 py-2 rounded-md cursor-pointer font-mono text-[11px] font-bold tracking-widest transition-colors shadow-sm"
            >
              ↻ SYNC
            </button>
          </div>
        </div>

        {metricsTickets?.error && (
          <div className="mb-4 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg font-mono text-xs text-yellow-500">
            Métricas AutoTask/Datto: {metricsTickets.error} — Revisa .env y usa SYNC para reintentar.
          </div>
        )}

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl shadow-sm hover:border-primary/40 transition-colors duration-200 p-5 animate-[slideIn_0.4s_ease_forwards]">
            <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mb-2.5">Tiempo resolución (avg)</div>
            <div className="font-mono text-[38px] font-bold tracking-tight leading-none text-cyan-400">
              {avgResponseMinutes != null ? `${avgResponseMinutes}m` : "—"}
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              <span className="text-[10px] text-muted-foreground font-mono">
                {avgResponseMinutes != null ? "Últimos 7 días · AutoTask" : "Resueltos esta semana"}
              </span>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl shadow-sm hover:border-primary/40 transition-colors duration-200 p-5 animate-[slideIn_0.4s_ease_forwards] [animation-delay:50ms] opacity-0" style={{animationFillMode: 'forwards'}}>
            <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mb-2.5">Resueltos Hoy</div>
            <div className="font-mono text-[38px] font-bold tracking-tight leading-none text-green-500">
              <Ticker value={resolvedTodayCount} />
            </div>
            <div className="font-mono text-[10px] text-muted-foreground mt-2.5">
              /{resolvedWeekCount} esta semana · AutoTask
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl shadow-sm hover:border-primary/40 transition-colors duration-200 p-5 animate-[slideIn_0.4s_ease_forwards] [animation-delay:100ms] opacity-0" style={{animationFillMode: 'forwards'}}>
            <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mb-2.5">Tickets Abiertos</div>
            <div className="font-mono text-[38px] font-bold tracking-tight leading-none text-orange-500">
              <Ticker value={openTicketsCount} />
            </div>
            <div className="font-mono text-[10px] text-muted-foreground mt-2.5">
              AutoTask · en vivo
            </div>
          </div>
          
          <div className={`bg-card border rounded-xl shadow-sm hover:border-primary/40 transition-colors duration-200 p-5 animate-[slideIn_0.4s_ease_forwards] [animation-delay:150ms] opacity-0 ${(metricsSlaBreached ?? 0) > 0 ? "border-red-900/50" : "border-border"}`} style={{animationFillMode: 'forwards'}}>
            <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mb-2.5">SLA Breach</div>
            <div className={`font-mono text-[38px] font-bold tracking-tight leading-none ${(metricsSlaBreached ?? 0) > 0 ? "text-red-500" : "text-green-500"}`}>
              <Ticker value={metricsSlaBreached ?? 0} />
            </div>
            <div className="font-mono text-[10px] text-muted-foreground mt-2.5">
              {(metricsSlaBreached ?? 0) > 0 ? "⚠ Requiere atención" : "✓ Dentro del SLA"}
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl shadow-sm hover:border-primary/40 transition-colors duration-200 p-5 animate-[slideIn_0.4s_ease_forwards] [animation-delay:200ms] opacity-0" style={{animationFillMode: 'forwards'}}>
            <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mb-2.5">Dispositivos RMM</div>
            <div className="font-mono text-[38px] font-bold tracking-tight leading-none text-indigo-400">
              <Ticker value={patchDevices?.length ?? metricsPatches?.devicesTotal ?? 0} />
            </div>
            <div className="font-mono text-[10px] text-muted-foreground mt-2.5">
              Datto RMM · total cuenta
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-[1.6fr_1fr] gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl shadow-sm p-5 pb-6">
            <div className="flex justify-between items-center mb-5">
              <div>
                <div className="font-mono text-[10px] tracking-[3px] text-primary/80 uppercase mb-1">
                  TIEMPO DE RESOLUCIÓN — ÚLTIMOS 7 DÍAS
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  Promedio minutos (creación → cierre) · línea roja = SLA 30 min
                </div>
              </div>
              <LiveDot />
            </div>
            
            <div className="relative w-full h-[180px]">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={responseTimeChartData}>
                  <defs>
                    <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "monospace" }}
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
                <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-muted-foreground pointer-events-none">
                  Sin datos (resueltos esta semana)
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl shadow-sm p-5 pb-6">
            <div className="font-mono text-[10px] tracking-[3px] text-primary/80 uppercase pb-3 border-b border-border/50 mb-4">
              TICKETS — SEMANA ACTUAL
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyChartData} barGap={4}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} opacity={0.5} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="resolved" fill="#22c55e" radius={[3, 3, 0, 0]} name="resolved" opacity={0.85} />
                <Bar dataKey="open" fill="#f97316" radius={[3, 3, 0, 0]} name="open" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                <span className="font-mono text-[10px] text-muted-foreground">Resueltos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                <span className="font-mono text-[10px] text-muted-foreground">Abiertos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metrics Row */}
        <div className="grid grid-cols-[1fr_2fr] gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <div className="font-mono text-[10px] tracking-[3px] text-primary/80 uppercase pb-3 border-b border-border/50 mb-4">
              RESUMEN MENSUAL
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: "Tickets resueltos", value: resolvedMonthCount, color: "#22c55e", suffix: "", max: Math.max(resolvedMonthCount, 50) },
                { label: "Avg resolución (7d)", value: avgResponseMinutes, color: avgResponseMinutes != null && avgResponseMinutes <= 30 ? "#22c55e" : "#eab308", suffix: "m", max: 120, fallback: "Sin datos" },
                { label: "SLA cumplido (7d)", value: slaWeekPercent, color: slaWeekPercent != null && slaWeekPercent >= 80 ? "#22d3ee" : "#f97316", suffix: "%", max: 100, fallback: "Sin datos" },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="font-mono text-[11px] text-muted-foreground">{m.label}</span>
                    <span className="font-mono text-sm font-bold" style={{ color: m.color }}>
                      {typeof m.value === "number" ? m.value + m.suffix : (m.fallback ?? m.value ?? "—")}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full opacity-80 transition-all duration-1000 ease-out"
                      style={{
                        width: `${typeof m.value === "number" && m.max > 0 ? Math.min((m.value / m.max) * 100, 100) : 0}%`,
                        background: m.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <div className="font-mono text-[10px] tracking-[3px] text-primary/80 uppercase pb-3 border-b border-border/50 mb-4">
              ESTADO DE PARCHES — DATTO RMM
            </div>
            <div className="grid grid-cols-2 gap-6">
              {patchData.length === 0 ? (
                <div className="col-span-2 text-center py-6 font-mono text-[11px] text-muted-foreground">
                  Sin datos — conectar API Datto RMM
                </div>
              ) : patchData.map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-xs font-bold text-foreground/80">{p.name}</span>
                    {p.critical > 0 && (
                      <span className="font-mono text-[9px] font-bold tracking-widest px-2 py-0.5 rounded bg-red-500/15 text-red-500 uppercase">
                        {p.critical} CRÍTICO
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mb-3">
                    <div className="flex-1 text-center">
                      <div className="font-mono text-[22px] font-bold text-green-500">{p.compliant}%</div>
                      <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mt-0.5">Compliant</div>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="font-mono text-[22px] font-bold text-orange-500">{p.pending}%</div>
                      <div className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground mt-0.5">Pendientes</div>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-border flex">
                    <div style={{ width: `${p.compliant}%` }} className="bg-green-500 opacity-80" />
                    <div style={{ width: `${Math.max(0, (p.pending ?? 0) - (p.critical ?? 0))}%` }} className="bg-orange-500 opacity-70" />
                    <div style={{ width: `${p.critical}%` }} className="bg-red-500" />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="font-mono text-[9px] text-green-500">OK</span>
                    <span className="font-mono text-[9px] text-orange-500">PENDING</span>
                    <span className="font-mono text-[9px] text-red-500">CRITICAL</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 pb-2">
          <div className="flex justify-between items-center mb-1">
            <div className="font-mono text-[10px] tracking-[3px] text-primary/80 uppercase">
              {soloAbiertos ? 'TICKETS ABIERTOS' : 'MIS TICKETS (HISTORIAL)'} — AUTOTASK
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/mis-tickets"
                className="bg-transparent border border-border text-muted-foreground px-3 py-1.5 rounded-md font-mono text-[10px] tracking-widest no-underline hover:border-primary/50 hover:text-foreground transition-colors"
              >
                VER TODOS →
              </Link>
              <label className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground tracking-widest">
                Asignado a:
                <select
                  value={assignedToFilter}
                  onChange={(e) => setAssignedToFilter(e.target.value)}
                  className="bg-background border border-border text-foreground px-2.5 py-1.5 rounded-md font-mono text-[11px] cursor-pointer min-w-[140px] focus:outline-none focus:border-primary/50"
                >
                  <option value="">Todos</option>
                  {myResourceId != null && <option value="me">Yo</option>}
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>{r.fullName}</option>
                  ))}
                </select>
              </label>
              {!soloAbiertos && (
                <button
                  type="button"
                  onClick={() => setSoloAbiertos(true)}
                  className="px-2.5 py-1.5 bg-blue-500/10 border border-border text-blue-400 rounded-md font-mono text-[10px] cursor-pointer hover:bg-blue-500/20 transition-colors tracking-widest"
                >
                  Solo abiertos
                </button>
              )}
              <button
                onClick={() => refetchTickets()}
                className="bg-transparent border border-border text-muted-foreground px-3 py-1.5 rounded-md font-mono text-[10px] cursor-pointer tracking-widest hover:border-primary/50 hover:text-foreground transition-colors"
              >
                ↻ ACTUALIZAR
              </button>
            </div>
          </div>
          
          <div className="border-b border-border/50 mb-4 mt-3" />
          
          {backendUnavailable && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-md mb-3 font-mono text-xs text-orange-500">
              Backend no disponible (conexión rechazada). Inicia el backend con <strong>php artisan serve</strong> en la carpeta backend.
            </div>
          )}
          
          {apiMessage && !backendUnavailable && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md mb-3 font-mono text-xs text-blue-400">
              {apiMessage}
            </div>
          )}
          
          {ticketsError && !backendUnavailable && !apiMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md mb-3 font-mono text-xs text-red-500">
              {ticketsError}
            </div>
          )}

          <div className="grid grid-cols-[100px_1fr_100px_90px_70px_80px] gap-3 px-4 pb-2.5">
            {["TICKET", "TÍTULO / ESTATUS", "PRIORIDAD", "ESTADO", "ACTIVIDAD", "TECH"].map((h) => (
              <div key={h} className="font-mono text-[10px] tracking-wider uppercase text-muted-foreground">
                {h}
              </div>
            ))}
          </div>

          {ticketsLoading ? (
            <div className="p-6 text-center text-muted-foreground font-mono text-xs">Cargando tickets…</div>
          ) : tickets.length === 0 && !backendUnavailable ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-[13px] border-t border-border/50">
              {soloAbiertos ? 'No hay tickets abiertos en este momento.' : 'No hay tickets que mostrar.'}
              {apiMessage && <div className="mt-2.5 text-blue-400 text-xs">{apiMessage}</div>}
              {soloAbiertos && (
                <button
                  type="button"
                  onClick={() => setSoloAbiertos(false)}
                  className="mt-3.5 px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-md font-mono text-[11px] cursor-pointer hover:bg-blue-500/20 transition-colors"
                >
                  Ver todos los tickets (historial)
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {tickets.map((t, i) => {
                const statusLbl = t.statusLabel || t.status || "—";
                const priorityConfigMatch = priorityConfig[t.priorityLabel];
                const priorityLbl = priorityConfigMatch ? priorityConfigMatch.label : (t.priorityLabel || "—");
                const priorityClasses = priorityConfigMatch ? `${priorityConfigMatch.bgClass} ${priorityConfigMatch.textClass}` : "bg-slate-500/15 text-slate-400";
                const statusClasses = statusColorClasses[statusLbl] || "bg-slate-500/15 text-slate-400";
                
                return (
                  <div key={t.id} className="animate-[slideIn_0.3s_ease_forwards]" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}>
                    <div
                      className={`grid grid-cols-[100px_1fr_100px_90px_70px_80px] gap-3 px-4 py-3.5 items-center border-b border-border/50 transition-colors duration-150 cursor-pointer ${activeTicket === t.id ? "bg-muted/50" : "hover:bg-muted/30"}`}
                      onClick={() => setActiveTicket(activeTicket === t.id ? null : t.id)}
                    >
                      <div className="font-mono text-xs font-bold text-primary">
                        {t.ticketNumber || t.id}
                      </div>
                      <div className="min-w-0 pr-4">
                        <div className="text-[13px] text-foreground font-semibold mb-1 truncate">
                          {t.title}
                        </div>
                        <span className={`font-mono text-[9px] font-bold tracking-widest px-2 py-0.5 rounded uppercase ${statusClasses}`}>
                          {statusLbl}
                        </span>
                      </div>
                      <div>
                        <span className={`font-mono text-[9px] font-bold tracking-widest px-2 py-0.5 rounded uppercase ${priorityClasses}`}>
                          {priorityLbl}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground" title="Última actividad">
                        {formatRelative(t.completedDate || t.lastActivityDate)}
                      </div>
                      <div className="font-mono text-[11px] text-foreground/60">
                        {t.estimatedHours != null ? `${Number(t.estimatedHours)}h` : "—"}
                      </div>
                      <div className="flex items-center gap-2">
                        {t.assignedResource ? (
                          <div title={t.assignedResource.fullName} className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center font-bold text-[10px] text-white font-mono shadow-sm">
                            {t.assignedResource.initials || "—"}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Detail Panel */}
                    {activeTicket === t.id && (
                      <div className="bg-muted/40 border-y border-border/80 px-5 py-4 animate-[slideIn_0.2s_ease]">
                        {detailLoading ? (
                          <div className="text-muted-foreground font-mono text-xs">Cargando detalle y sugerencias IA…</div>
                        ) : detailError ? (
                          <div className="p-3 bg-red-500/10 rounded-md font-mono text-xs text-red-500">
                            No se pudo cargar el detalle: {detailError}
                          </div>
                        ) : ticketDetail?.ticket ? (
                          <>
                            {ticketDetail.ticket.description && (
                              <div className="mb-3.5">
                                <div className="font-mono text-[9px] text-muted-foreground tracking-widest mb-1.5 uppercase">Descripción del problema</div>
                                <p className="font-mono text-xs text-foreground/90 leading-relaxed max-w-3xl whitespace-pre-wrap m-0">
                                  {ticketDetail.ticket.description}
                                </p>
                              </div>
                            )}
                            
                            <div className="flex flex-col gap-3 mb-3.5">
                              <div className="font-mono text-[11px]">
                                <span className="text-muted-foreground">Estatus: </span>
                                <span className="text-foreground font-semibold">{ticketDetail.ticket.statusLabel ?? ticketDetail.ticket.status ?? "—"}</span>
                              </div>
                              <div className="font-mono text-[11px]">
                                <span className="text-muted-foreground">Cuenta (Company): </span>
                                <strong className="text-foreground">{ticketDetail.ticket.account?.companyName ?? "—"}</strong>
                                {ticketDetail.ticket.account?.phone && <span className="text-muted-foreground ml-2"> · {ticketDetail.ticket.account.phone}</span>}
                              </div>
                              <div className="font-mono text-[11px]">
                                <span className="text-muted-foreground">Contacto: </span>
                                <strong className="text-foreground">{ticketDetail.ticket.contact?.fullName ?? "—"}</strong>
                                {ticketDetail.ticket.contact?.email && <span className="text-muted-foreground ml-2"> · {ticketDetail.ticket.contact.email}</span>}
                                {ticketDetail.ticket.contact?.phone && <span className="text-muted-foreground"> · Tel: {ticketDetail.ticket.contact.phone}</span>}
                                {ticketDetail.ticket.contact?.extension && <span className="text-muted-foreground"> · Ext: {ticketDetail.ticket.contact.extension}</span>}
                                {!ticketDetail.ticket.contact?.fullName && !ticketDetail.ticket.contact?.email && !ticketDetail.ticket.contact?.phone && <span className="text-muted-foreground">—</span>}
                              </div>
                              <div className="font-mono text-[11px]">
                                <span className="text-muted-foreground">Técnico asignado: </span>
                                <span className="text-foreground">{ticketDetail.ticket.assignedResource?.fullName || ticketDetail.ticket.creatorResource?.fullName || ticketDetail.ticket.completedByResource?.fullName || "—"}</span>
                                {(ticketDetail.ticket.assignedResource?.phone || ticketDetail.ticket.assignedResource?.extension) && (
                                  <span className="text-muted-foreground ml-2">
                                    {ticketDetail.ticket.assignedResource?.phone && `Tel: ${ticketDetail.ticket.assignedResource.phone}`}
                                    {ticketDetail.ticket.assignedResource?.extension && ` · Ext: ${ticketDetail.ticket.assignedResource.extension}`}
                                  </span>
                                )}
                              </div>
                              
                              {(!ticketDetail.ticket.account?.companyName && !ticketDetail.ticket.contact?.fullName && !ticketDetail.ticket.assignedResource?.fullName && !ticketDetail.ticket.creatorResource?.fullName) && (
                                <div className="font-mono text-[10px] text-muted-foreground italic">
                                  Si no aparecen datos, el ticket en AutoTask puede no tener cuenta, contacto o técnico asignado.
                                </div>
                              )}
                            </div>
                            
                            {ticketDetail.ticket.resolution && (
                              <div className="flex gap-3 items-start mb-3.5">
                                <div className="bg-green-500/10 border border-green-500/20 rounded-md px-2.5 py-1.5 shrink-0">
                                  <span className="font-mono text-[9px] text-green-500 tracking-widest uppercase">✓ Resolución</span>
                                </div>
                                <p className="font-mono text-xs text-foreground/70 leading-relaxed max-w-3xl m-0">
                                  {ticketDetail.ticket.resolution}
                                </p>
                              </div>
                            )}
                            
                            {ticketDetail.suggestions?.length > 0 && (
                              <div className="mb-3.5">
                                <div className="font-mono text-[9px] text-indigo-400 tracking-widest mb-2 uppercase">Sugerencias IA</div>
                                <ul className="m-0 pl-4 font-mono text-xs text-foreground/70 leading-relaxed list-disc">
                                  {ticketDetail.suggestions.map((s, idx) => (
                                    <li key={idx} className="mb-1">{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="flex flex-col gap-2 mt-3 flex-wrap">
                              <div className="flex gap-2.5 flex-wrap">
                                <Link 
                                  to={`/mis-tickets?ticket=${ticketDetail.ticket.id}`} 
                                  className="bg-green-500/10 border border-green-500/20 text-green-500 px-3 py-1.5 rounded-md font-mono text-[10px] no-underline hover:bg-green-500/20 transition-colors"
                                >
                                  Ver detalle en Mis Tickets →
                                </Link>
                                <a
                                  href={`${ticketDetail.autotaskTicketDetailUrl ?? autotaskTicketDetailUrl ?? "https://ww3.autotask.net/Autotask/AutotaskExtend/ExecuteCommand.aspx?Code=OpenTicketDetail&TicketID="}${ticketDetail.ticket.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Abre en AutoTask. Debes estar logueado en AutoTask en este navegador."
                                  className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-md font-mono text-[10px] no-underline hover:bg-blue-500/20 transition-colors"
                                >
                                  Ver en AutoTask →
                                </a>
                                <Link 
                                  to="/ia-asistente" 
                                  className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-md font-mono text-[10px] no-underline hover:bg-indigo-500/20 transition-colors"
                                >
                                  Preguntar a IA →
                                </Link>
                              </div>
                              <div className="font-mono text-[9px] text-muted-foreground mt-1">
                                Debes estar logueado en AutoTask en este navegador. Si ves error, verifica AUTOTASK_WEB_URL en .env.
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center font-mono text-[9px] text-muted-foreground tracking-[2px] uppercase">
          HELPDEX v0.1.0 · AUTOTASK · DATTO RMM · Última actualización métricas: {metricsGeneratedAt ? new Date(metricsGeneratedAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
        </div>
      </main>
    </div>
  );
}
