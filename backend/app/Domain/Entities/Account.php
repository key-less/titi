<?php

namespace App\Domain\Entities;

final class Account
{
    public function __construct(
        public int $id,
        public string $companyName,
        public ?string $phone = null,
        public ?string $website = null,
        public ?int $accountType = null,
    ) {}
}
