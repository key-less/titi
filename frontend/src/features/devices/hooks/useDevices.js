import { useState, useEffect, useCallback } from 'react';
import {
  fetchSitesSummary,
  fetchDevices,
  fetchDeviceDetail,
  fetchDeviceAlerts,
} from '../api/devicesApi';

/**
 * Hook para el módulo Dispositivos: sites summary, lista de dispositivos, detalle y alertas.
 */
export function useDevices(siteUid = null) {
  const [sitesSummary, setSitesSummary] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [error, setError] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [apiMessage, setApiMessage] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      const data = await fetchSitesSummary(siteUid || null);
      setSitesSummary(data.sites ?? []);
      setConfigured(data.configured ?? false);
      setApiMessage(data.message ?? null);
    } catch (e) {
      setError(e.message || 'Error al cargar resumen de sites');
      setSitesSummary([]);
    } finally {
      setLoadingSummary(false);
    }
  }, [siteUid]);

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true);
    setError(null);
    try {
      const data = await fetchDevices(siteUid || null);
      setDevices(data.devices ?? []);
      setConfigured(data.configured ?? false);
      if (data.message) setApiMessage(data.message);
    } catch (e) {
      setError(e.message || 'Error al cargar dispositivos');
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, [siteUid]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const refetch = useCallback(() => {
    loadSummary();
    loadDevices();
  }, [loadSummary, loadDevices]);

  return {
    sitesSummary,
    devices,
    loading: loadingSummary || loadingDevices,
    loadingSummary,
    loadingDevices,
    error,
    configured,
    apiMessage,
    refetch,
    fetchDeviceDetail,
    fetchDeviceAlerts,
  };
}
