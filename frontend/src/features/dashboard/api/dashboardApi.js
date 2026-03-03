import { api } from '../../../shared/api/client';

/**
 * GET /api/dashboard/metrics — métricas para el Dashboard (AutoTask + Datto RMM).
 */
export async function fetchDashboardMetrics(params = {}) {
  const search = new URLSearchParams();
  if (params.site_uid) search.set('site_uid', params.site_uid);
  const qs = search.toString();
  const path = qs ? `/dashboard/metrics?${qs}` : '/dashboard/metrics';
  return api.get(path);
}
