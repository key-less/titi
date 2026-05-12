export const TICKET_STATUSES = [
  { value: 'New', label: 'Nuevo' },
  { value: 'Waiting Approval', label: 'Esperando aprobación' },
  { value: 'Dispatched', label: 'Enviado' },
  { value: 'Change Order', label: 'Orden de cambio' },
  { value: 'Customer Note Added', label: 'Nota del cliente' },
  { value: 'In Progress', label: 'En progreso' },
  { value: 'Escalate', label: 'Escalado' },
  { value: 'Waiting Materials', label: 'Esperando materiales' },
  { value: 'Waiting Customer', label: 'Esperando cliente' },
  { value: 'Waiting Vendor', label: 'Esperando proveedor' },
  { value: 'On Hold', label: 'En espera' },
  { value: 'Work Complete', label: 'Trabajo completado' },
  { value: 'Complete', label: 'Completo' },
  { value: 'RMM Resolved', label: 'Resuelto RMM' },
];

export const CLOSED_STATUSES = new Set(['Complete', 'Work Complete', 'RMM Resolved']);

export const statusLabel = (value) => {
  const found = TICKET_STATUSES.find((s) => s.value === value);
  return found ? found.label : value || '—';
};

export const isClosedStatus = (value) => CLOSED_STATUSES.has(value);
