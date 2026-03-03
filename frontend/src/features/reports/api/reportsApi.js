import { api } from '../../../shared/api/client';

/**
 * GET /api/reports/summary — reporte agregado: tickets por estado, dispositivos por site/tipo, parches por categoría.
 * @param {string} period - 24h | 7d | 6m
 */
export async function fetchReportsSummary(period = '7d') {
  const data = await api.get(`/reports/summary?period=${encodeURIComponent(period)}`);
  return data;
}
