import { api } from '../../../shared/api/client';

/**
 * GET /api/devices/sites-summary — resumen por site: total, workstation, network, esxi, printer, groups.
 */
export async function fetchSitesSummary(siteUid = null) {
  const qs = siteUid ? `?site_uid=${encodeURIComponent(siteUid)}` : '';
  const data = await api.get(`/devices/sites-summary${qs}`);
  return {
    sites: data.sites ?? [],
    configured: data.configured ?? false,
    message: data.message ?? null,
  };
}

/**
 * GET /api/devices?site_uid= — lista de dispositivos.
 */
export async function fetchDevices(siteUid = null) {
  const qs = siteUid ? `?site_uid=${encodeURIComponent(siteUid)}` : '';
  const data = await api.get(`/devices${qs}`);
  return {
    devices: data.devices ?? [],
    configured: data.configured ?? false,
    message: data.message ?? null,
  };
}

/**
 * GET /api/devices/:deviceUid — detalle de un dispositivo (incl. portalUrl, auditSummary).
 */
export async function fetchDeviceDetail(deviceUid) {
  const data = await api.get(`/devices/${encodeURIComponent(deviceUid)}`);
  return {
    device: data.device ?? null,
    auditSummary: data.auditSummary ?? null,
    configured: data.configured ?? false,
    message: data.message ?? null,
  };
}

/**
 * GET /api/devices/:deviceUid/alerts — alertas (abiertas por defecto).
 */
export async function fetchDeviceAlerts(deviceUid, open = true) {
  const qs = open ? '' : '?open=false';
  const data = await api.get(`/devices/${encodeURIComponent(deviceUid)}/alerts${qs}`);
  return {
    alerts: data.alerts ?? [],
    configured: data.configured ?? false,
  };
}
