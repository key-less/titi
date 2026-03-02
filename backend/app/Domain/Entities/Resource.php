<?php

namespace App\Domain\Entities;

final class Resource
{
    public function __construct(
        public int $id,
        public string $firstName,
        public string $lastName,
        public ?string $email = null,
        public ?string $userName = null,
    ) {}

    public function fullName(): string
    {
        return trim($this->firstName . ' ' . $this->lastName);
    }

    /** Iniciales para avatar (ej. "AR") */
    public function initials(): string
    {
        $f = mb_substr($this->firstName, 0, 1);
        $l = mb_substr($this->lastName, 0, 1);
        return strtoupper($f . $l);
    }
}
