<?php

namespace Tests\Concerns;

use App\Shell\Models\User;

trait SeedsPair
{
    /** @return array{0: User, 1: User} the issuer, then the recipient */
    private function seedPair(): array
    {
        return [
            User::factory()->create(['name' => 'Alice Smith']),
            User::factory()->create(['name' => 'Bob Jones']),
        ];
    }
}
