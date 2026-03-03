import { useState, useEffect, useCallback } from 'react';
import { fetchDashboardMetrics } from '../api/dashboardApi';

const defaultTickets = {
  openTickets: 0,
  resolvedToday: 0,
  resolvedWeek: 0,
  resolvedMonth: 0,
  weeklyChart: [],
  byStatus: {},
  error: null,
};
const defaultPatches = {
  configured: false,
  devicesTotal: 0,
  byCategory: [],
};

export function useDashboardMetrics(options = {}) {
  const { siteUid = null, refetchIntervalMs = 60 * 1000 } = options;
  const [tickets, setTickets] = useState({ ...defaultTickets, responseTimeChart: [] });
  const [patches, setPatches] = useState(defaultPatches);
  const [slaBreached, setSlaBreached] = useState(0);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardMetrics({ site_uid: siteUid ?? undefined });
      setTickets({
        openTickets: data.tickets?.openTickets ?? 0,
        resolvedToday: data.tickets?.resolvedToday ?? 0,
        resolvedWeek: data.tickets?.resolvedWeek ?? 0,
        resolvedMonth: data.tickets?.resolvedMonth ?? 0,
        weeklyChart: Array.isArray(data.tickets?.weeklyChart) ? data.tickets.weeklyChart : [],
        responseTimeChart: Array.isArray(data.tickets?.responseTimeChart) ? data.tickets.responseTimeChart : [],
        byStatus: data.tickets?.byStatus ?? {},
        error: data.tickets?.error ?? null,
      });
      setPatches({
        configured: data.patches?.configured ?? false,
        devicesTotal: data.patches?.devicesTotal ?? 0,
        byCategory: Array.isArray(data.patches?.byCategory) ? data.patches.byCategory : [],
      });
      setSlaBreached(data.slaBreached ?? 0);
      setGeneratedAt(data.generatedAt ?? null);
    } catch (e) {
      setError(e.message || 'Error al cargar métricas');
      setTickets(prev => ({ ...prev, error: e.message }));
    } finally {
      setLoading(false);
    }
  }, [siteUid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (refetchIntervalMs <= 0) return;
    const interval = setInterval(load, refetchIntervalMs);
    return () => clearInterval(interval);
  }, [load, refetchIntervalMs]);

  return {
    tickets,
    patches,
    slaBreached,
    generatedAt,
    loading,
    error,
    refetch: load,
  };
}
