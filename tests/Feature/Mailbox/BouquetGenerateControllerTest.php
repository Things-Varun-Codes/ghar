<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\MiniApps\Mailbox\Services\FakeBouquetGenerator;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BouquetGenerateControllerTest extends TestCase
{
    use RefreshDatabase;

    private function bindFake(): void
    {
        $this->app->bind(
            BouquetImageGenerator::class,
            FakeBouquetGenerator::class,
        );
    }

    public function test_generate_returns_base64_preview_with_zero_persistence(): void
    {
        Storage::fake('s3');
        $this->bindFake();

        // Sentinel: non-empty token ensures the credential-leak check is non-vacuous.
        config(['services.bouquet.cf_token' => 'SENTINEL-CF-TOKEN-XYZ']);

        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/apps/our-mailbox/bouquets/generate', [
                'flowers' => ['red_rose'],
                'refine' => 'soft light',
            ]);

        // PRIMARY RED: route absent → 404; assertStatus(200) fails.
        $response->assertStatus(200);

        // Response structure.
        $response->assertJsonStructure(['image', 'mime']);
        $this->assertIsString($response->json('image'), 'image must be a base64 string');

        // Cloudflare token must never appear in the response body.
        $this->assertStringNotContainsString(
            'SENTINEL-CF-TOKEN-XYZ',
            $response->getContent(),
            'CLOUDFLARE_WORKERS_AI_TOKEN must not appear in the generate endpoint response'
        );

        // Zero persistence: no DB rows, no stored objects.
        $this->assertDatabaseCount('mailbox_bouquets', 0);
        $this->assertCount(
            0,
            Storage::disk('s3')->allFiles(),
            'Generate must write zero stored objects'
        );
    }

    public function test_generate_requires_authentication(): void
    {
        $response = $this->postJson('/apps/our-mailbox/bouquets/generate', [
            'flowers' => ['red_rose'],
        ]);

        $response->assertStatus(401);
    }
}
