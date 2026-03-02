import { api } from '../../../shared/api/client';

/**
 * GET /api/tickets — lista de tickets (AutoTask).
 * @param {{ status?: number[], limit?: number, openOnly?: boolean, period?: string, assignedResourceId?: null|'me'|number }} params
 */
export async function fetchTickets(params = {}) {
  const search = new URLSearchParams();
  if (params.limit) search.set('limit', String(params.limit));
  if (params.status?.length) params.status.forEach((s) => search.append('status[]', s));
  if (params.openOnly) search.set('open_only', '1');
  if (params.period && params.period !== 'all') search.set('period', params.period);
  if (params.assignedResourceId != null && params.assignedResourceId !== '') {
    if (params.assignedResourceId === 'me' || params.assignedResourceId === 'mine') {
      search.set('assigned_resource_id', 'me');
    } else {
      search.set('assigned_resource_id', String(params.assignedResourceId));
    }
  }
  const qs = search.toString();
  const path = qs ? `/tickets?${qs}` : '/tickets';
  const data = await api.get(path);
  return { tickets: data.tickets ?? [], count: data.count ?? 0, message: data.message };
}

/**
 * GET /api/tickets/status — estado de la API y my_resource_id para filtro "Yo".
 */
export async function fetchTicketStatus() {
  return api.get('/tickets/status');
}

/**
 * GET /api/tickets/status-ids — status_labels (id => nombre) para filtro por estado.
 */
export async function fetchTicketStatusIds() {
  const data = await api.get('/tickets/status-ids');
  return data.status_labels ?? {};
}

/**
 * GET /api/resources — lista de recursos (personas) para filtro "Asignado a".
 */
export async function fetchResources() {
  const data = await api.get('/resources');
  return data.resources ?? [];
}

/**
 * GET /api/tickets/:id — ticket con cuenta, contacto, técnicos y sugerencias de IA.
 */
export async function fetchTicketWithSuggestions(id) {
  return api.get(`/tickets/${id}`);
}

/**
 * POST /api/ai/chat — mensaje al asistente de IA.
 */
export async function sendChatMessage(message, ticketContext = null) {
  const data = await api.post('/ai/chat', { message, ticketContext });
  return data.response ?? '';
}
