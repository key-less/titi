import { useState, useEffect, useCallback } from 'react';
import { fetchPatches, fetchPatchSites } from '../api/patchesApi';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

export function usePatches(siteUid = null) {
  const [sites, setSites] = useState([]);
  const [devices, setDevices] = useState([]);
  const [patches, setPatches] = useState([]);
  const [summary, setSummary] = useState({});
  const [summaryLabels, setSummaryLabels] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSites, setLoadingSites] = useState(true);
  const [error, setError] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [apiMessage, setApiMessage] = useState(null);

  const loadSites = useCallback(async () => {
    setLoadingSites(true);
    try {
      const list = await fetchPatchSites();
      setSites(list);
    } catch (_) {
      setSites([]);
    } finally {
      setLoadingSites(false);
    }
  }, []);

  const loadPatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    setApiMessage(null);
    try {
      const data = await fetchPatches(siteUid);
      setDevices(data.devices ?? []);
      setPatches(data.patches ?? []);
      setSummary(data.summary ?? {});
      setSummaryLabels(data.summaryLabels ?? {});
      setLastUpdated(data.lastUpdated ?? null);
      setConfigured(data.configured ?? false);
      if (data.message) setApiMessage(data.message);
    } catch (e) {
      setError(e.message || 'Error al cargar parches');
      setDevices([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }, [siteUid]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    loadPatches();
  }, [loadPatches]);

  useEffect(() => {
    const interval = setInterval(loadPatches, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadPatches]);

  return {
    sites,
    devices,
    patches,
    summary,
    summaryLabels,
    lastUpdated,
    loading,
    loadingSites,
    error,
    configured,
    apiMessage,
    refetch: loadPatches,
    refetchSites: loadSites,
  };
}
