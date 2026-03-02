<?php

namespace App\Domain\Entities;

final class Contact
{
    public function __construct(
        public int $id,
        public string $firstName,
        public string $lastName,
        public ?string $email = null,
        public ?string $phone = null,
        public ?string $title = null,
    ) {}

    public function fullName(): string
    {
        return trim($this->firstName . ' ' . $this->lastName);
    }
}
