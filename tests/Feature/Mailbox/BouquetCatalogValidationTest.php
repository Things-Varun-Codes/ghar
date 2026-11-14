<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\MiniApps\Mailbox\Services\FakeBouquetGenerator;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
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

    /** @return array<string, array{list<string>}> */
    public static function rejectedSelections(): array
    {
        return [
            'a key outside the catalog' => [['not_a_real_flower_key']],
            'no flowers' => [[]],
            'six flowers' => [['red_rose', 'pink_rose', 'white_rose', 'lavender', 'sunflower', 'daisy']],
        ];
    }

    /** @param  list<string>  $flowers */
    #[DataProvider('rejectedSelections')]
    public function test_a_selection_outside_the_catalog_or_the_one_to_five_range_is_rejected(array $flowers): void
    {
        $this->bindFake();

        $this->actingAs(User::factory()->create())
            ->postJson('/apps/our-mailbox/bouquets/generate', ['flowers' => $flowers])
            ->assertStatus(422);
    }
}
