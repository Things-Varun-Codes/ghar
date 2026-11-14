<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BouquetFailureTest extends TestCase
{
    use RefreshDatabase;

    public function test_throwing_generator_returns_structured_non_2xx_with_no_artifacts(): void
    {
        Storage::fake('s3');

        $this->app->bind(
            BouquetImageGenerator::class,
            function () {
                return new class
                {
                    public function generate(string $prompt): mixed
                    {
                        throw new \RuntimeException(
                            'Fake generation failure — safety filter or quota exceeded'
                        );
                    }
                };
            }
        );

        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/apps/our-mailbox/bouquets/generate', [
                'flowers' => ['red_rose'],
            ]);

        // The controller catches the failure: 422 for a safety refusal, 500 otherwise.
        $this->assertTrue(
            in_array($response->status(), [422, 500]),
            "Expected 422 or 500 from a throwing generator, got {$response->status()}"
        );

        // Structured error: JSON response with a 'message' key.
        $response->assertJsonStructure(['message']);

        // Zero artifacts: no DB rows, no stored objects created on failure.
        $this->assertDatabaseCount('mailbox_messages', 0);
        $this->assertCount(
            0,
            Storage::disk('s3')->allFiles(),
            'A throwing generator must create zero stored objects'
        );
    }

    public function test_empty_bytes_generator_returns_non_2xx_with_no_artifacts(): void
    {
        Storage::fake('s3');

        // Stub: returns an object with empty bytes.  The controller must detect empty bytes
        // and return an error.
        $this->app->bind(
            BouquetImageGenerator::class,
            function () {
                return new class
                {
                    public function generate(string $prompt): mixed
                    {
                        return (object) ['bytes' => '', 'mimeType' => 'image/jpeg'];
                    }
                };
            }
        );

        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/apps/our-mailbox/bouquets/generate', [
                'flowers' => ['red_rose'],
            ]);

        $this->assertTrue(
            in_array($response->status(), [422, 500]),
            "Expected 422 or 500 from empty-bytes generator, got {$response->status()}"
        );

        $response->assertJsonStructure(['message']);

        $this->assertDatabaseCount('mailbox_messages', 0);
        $this->assertCount(
            0,
            Storage::disk('s3')->allFiles(),
            'An empty-bytes generator must create zero stored objects'
        );
    }
}
