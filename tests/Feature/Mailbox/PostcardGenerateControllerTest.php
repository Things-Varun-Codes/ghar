<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Contracts\ImageGenerator;
use App\MiniApps\Mailbox\Services\FakeImageGenerator;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PostcardGenerateControllerTest extends TestCase
{
    use RefreshDatabase;

    private function bindFake(): void
    {
        $this->app->bind(
            ImageGenerator::class,
            FakeImageGenerator::class,
        );
    }

    public function test_generate_returns_base64_preview_with_zero_persistence(): void
    {
        Storage::fake('s3');
        $this->bindFake();

        // Sentinel: non-empty token ensures the credential-leak check is non-vacuous.
        config(['services.image_ai.key' => 'SENTINEL-KEY-XYZ']);

        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/apps/our-exchange/postcards/generate', [
                'prompt' => 'A fox in the snow',
            ]);

        $response->assertStatus(200);

        // Response structure.
        $response->assertJsonStructure(['image', 'mime']);
        $this->assertIsString($response->json('image'), 'image must be a base64 string');

        // The key must never appear in the response body.
        $this->assertStringNotContainsString(
            'SENTINEL-KEY-XYZ',
            $response->getContent(),
            'IMAGE_AI_KEY must not appear in the generate endpoint response'
        );

        // Zero persistence: no DB rows, no stored objects.
        $this->assertDatabaseCount('mailbox_postcards', 0);
        $this->assertCount(
            0,
            Storage::disk('s3')->allFiles(),
            'Generate must write zero stored objects'
        );
    }

    public function test_generate_requires_authentication(): void
    {
        $response = $this->postJson('/apps/our-exchange/postcards/generate', [
            'prompt' => 'A fox in the snow',
        ]);

        $response->assertStatus(401);
    }
}
