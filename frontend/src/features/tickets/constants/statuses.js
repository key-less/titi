/**
 * Estatus de tickets (alineados con backend y AutoTask).
 * Usar statusLabel en la UI; el backend puede enviar status (enum value) o statusLabel.
 */
export const TICKET_STATUSES = [
  { value: 'In Progress', label: 'En progreso' },
  { value: 'Complete', label: 'Completo' },
  { value: 'Waiting Customer', label: 'Esperando cliente' },
  { value: 'Waiting Vendor', label: 'Esperando proveedor' },
  { value: 'Work Complete', label: 'Trabajo completado' },
];

export const statusLabel = (value) => {
  const found = TICKET_STATUSES.find((s) => s.value === value);
  return found ? found.label : value || '—';
};
