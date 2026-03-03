import { api } from '../../../shared/api/client';

/**
 * GET /api/patches/sites — lista de sites (organizaciones) para filtrar.
 */
export async function fetchPatchSites() {
  const data = await api.get('/patches/sites');
  return Array.isArray(data.sites) ? data.sites : [];
}

/**
 * GET /api/patches?site_uid=xxx — dispositivos con estado de parches.
 * @param {string|null} siteUid - UID del site o null para todos
 * @returns {{ devices: array, summary: object, summaryLabels: object, lastUpdated: string|null, configured: boolean, message: string|null }}
 */
export async function fetchPatches(siteUid = null) {
  const path = siteUid ? `/patches?site_uid=${encodeURIComponent(siteUid)}` : '/patches';
  const data = await api.get(path);
  return {
    devices: Array.isArray(data.devices) ? data.devices : [],
    summary: data.summary ?? {},
    summaryLabels: data.summaryLabels ?? {},
    patches: Array.isArray(data.patches) ? data.patches : [],
    lastUpdated: data.lastUpdated ?? null,
    configured: data.configured ?? false,
    message: data.message ?? null,
  };
}
