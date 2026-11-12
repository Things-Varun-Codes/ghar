<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\MiniApps\Mailbox\Services\FakeBouquetGenerator;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BouquetCatalogValidationTest extends TestCase
{
    use RefreshDatabase;

    private function bindFake(): void
    {
        $this->app->bind(
            BouquetImageGenerator::class,
            FakeBouquetGenerator::class,
        );
    }

    public function test_unknown_flower_key_returns_422(): void
    {
        $this->bindFake();

        /** @var User $user */
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/apps/our-mailbox/bouquets/generate', [
                'flowers' => ['not_a_real_flower_key'],
            ])
            ->assertStatus(422);
    }

    public function test_zero_flowers_returns_422(): void
    {
        $this->bindFake();

        /** @var User $user */
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/apps/our-mailbox/bouquets/generate', [
                'flowers' => [],
            ])
            ->assertStatus(422);
    }

    public function test_six_flowers_returns_422(): void
    {
        $this->bindFake();

        /** @var User $user */
        $user = User::factory()->create();

        // Once the catalog exists, take valid keys so the count-validation fires.  6 items: 5
        // from catalog + 1 repeat of the first (or 6 duplicates if only 5 exist).
        $validKeys = array_column(config('mailbox-bouquets', []), 'key');

        if (count($validKeys) >= 6) {
            $flowers = array_slice($validKeys, 0, 6);
        } elseif (! empty($validKeys)) {
            // Pad to 6 by repeating the first valid key.
            $flowers = array_merge(
                $validKeys,
                array_fill(0, 6 - count($validKeys), $validKeys[0])
            );
        } else {
            // No catalog yet — use placeholder keys; count check fires on any 6 items.
            $flowers = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
        }

        $this->actingAs($user)
            ->postJson('/apps/our-mailbox/bouquets/generate', [
                'flowers' => $flowers,
            ])
            ->assertStatus(422);
    }
}
