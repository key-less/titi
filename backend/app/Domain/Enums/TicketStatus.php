<?php

namespace App\Domain\Enums;

/**
 * Estatus de ticket soportados en HELPDEX.
 * Mapeables a los valores de la plataforma AutoTask (picklist status).
 */
enum TicketStatus: string
{
    case NEW = 'New';
    case IN_PROGRESS = 'In Progress';
    case COMPLETE = 'Complete';
    case WAITING_CUSTOMER = 'Waiting Customer';
    case WAITING_VENDOR = 'Waiting Vendor';
    case WORK_COMPLETE = 'Work Complete';

    public function label(): string
    {
        return $this->value;
    }

    /**
     * Intenta resolver un estatus desde el label devuelto por AutoTask.
     */
    public static function fromAutotaskLabel(?string $label): ?self
    {
        if ($label === null || $label === '') {
            return null;
        }
        $normalized = trim($label);
        foreach (self::cases() as $case) {
            if (strcasecmp($case->value, $normalized) === 0) {
                return $case;
            }
        }
        return null;
    }

    /**
     * Todos los labels para filtrar o mostrar en UI.
     * @return array<string>
     */
    public static function labels(): array
    {
        return array_map(fn (self $s) => $s->value, self::cases());
    }
}
