import { useState, useCallback } from 'react';
import { fetchTicketWithSuggestions } from '../api/ticketsApi';

export function useTicketWithSuggestions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (ticketId) => {
    if (!ticketId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTicketWithSuggestions(ticketId);
      setData(result);
    } catch (e) {
      setError(e.message || 'Error al cargar el ticket');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, loadTicket: load, clear };
}
