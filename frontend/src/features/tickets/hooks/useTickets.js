import { useState, useEffect, useCallback } from 'react';
import { fetchTickets } from '../api/ticketsApi';

// Datos de ejemplo cuando el backend no está disponible (evita ECONNREFUSED en pantalla)
const FALLBACK_TICKETS = [
  { id: 1, ticketNumber: 'T-EJEMPLO-001', title: 'Ejemplo: Backend no conectado', statusLabel: 'In Progress', priorityLabel: 'Medium', estimatedHours: 0 },
  { id: 2, ticketNumber: 'T-EJEMPLO-002', title: 'Inicia el backend con: php artisan serve', statusLabel: 'Waiting Customer', priorityLabel: 'Low', estimatedHours: 0 },
];

export function useTickets(options = {}) {
  const [tickets, setTickets] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiMessage, setApiMessage] = useState(null);
  const [backendUnavailable, setBackendUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setApiMessage(null);
    setBackendUnavailable(false);
    try {
      const data = await fetchTickets({
        limit: options.limit ?? 100,
        status: options.status,
        openOnly: options.openOnly,
        period: options.period,
        assignedResourceId: options.assignedResourceId,
      });
      const list = Array.isArray(data.tickets) ? data.tickets : [];
      const total = typeof data.count === 'number' ? data.count : list.length;
      setTickets(list);
      setCount(total);
      if (data.message) setApiMessage(data.message);
    } catch (e) {
      setError(e.message || 'Error al cargar tickets');
      setBackendUnavailable(true);
      setTickets(FALLBACK_TICKETS);
      setCount(FALLBACK_TICKETS.length);
    } finally {
      setLoading(false);
    }
  }, [
    options.limit,
    options.openOnly,
    options.period,
    options.assignedResourceId,
    Array.isArray(options.status) ? options.status.join(',') : '',
  ]);

  useEffect(() => {
    load();
  }, [load]);

  return { tickets, count, loading, error, apiMessage, backendUnavailable, refetch: load };
}
