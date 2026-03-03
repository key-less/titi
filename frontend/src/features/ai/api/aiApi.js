import { api } from '../../../shared/api/client';

/**
 * POST /api/ai/chat — mensaje al asistente de IA.
 * @param {string} message
 * @param {string|null} ticketContext — contexto opcional (ticket o parches).
 */
export async function sendChatMessage(message, ticketContext = null) {
  const body = { message };
  if (ticketContext) body.ticketContext = ticketContext;
  const data = await api.post('/ai/chat', body);
  return data.response ?? '';
}
