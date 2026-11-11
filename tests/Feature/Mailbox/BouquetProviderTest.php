<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\MiniApps\Mailbox\DTOs\GeneratedImage;
use App\MiniApps\Mailbox\Exceptions\BouquetGenerationException;
use App\MiniApps\Mailbox\Services\CloudflareBouquetGenerator;
use App\MiniApps\Mailbox\Services\FakeBouquetGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BouquetProviderTest extends TestCase
{
    use RefreshDatabase;

    public function test_fake_provider_resolves_to_fake_generator(): void
    {
        config(['services.bouquet.provider' => 'fake']);
        $this->app->forgetInstance(BouquetImageGenerator::class);

        $generator = app(BouquetImageGenerator::class);

        $this->assertInstanceOf(
            FakeBouquetGenerator::class,
            $generator
        );
    }

    public function test_unset_provider_in_production_throws(): void
    {
        // Force production environment for this test.
        $this->app['env'] = 'production';

        // Clear provider config to simulate "unset in production".
        config(['services.bouquet.provider' => null]);
        $this->app->forgetInstance(BouquetImageGenerator::class);

        $this->expectException(\RuntimeException::class);

        app(BouquetImageGenerator::class);
    }

    public function test_unset_provider_in_testing_resolves_fake(): void
    {
        // No provider configured — app env is 'testing' (phpunit.xml: APP_ENV=testing).
        config(['services.bouquet.provider' => null]);
        $this->app->forgetInstance(BouquetImageGenerator::class);

        $generator = app(BouquetImageGenerator::class);

        $this->assertInstanceOf(
            FakeBouquetGenerator::class,
            $generator
        );
    }

    public function test_cloudflare_provider_with_creds_resolves_successfully(): void
    {
        config([
            'services.bouquet.provider' => 'cloudflare',
            'services.bouquet.cf_account_id' => 'test-account-id',
            'services.bouquet.cf_token' => 'test-api-token',
        ]);
        $this->app->forgetInstance(BouquetImageGenerator::class);

        $generator = app(BouquetImageGenerator::class);

        $this->assertInstanceOf(
            CloudflareBouquetGenerator::class,
            $generator
        );
    }

    public function test_cloudflare_provider_with_empty_account_id_throws(): void
    {
        config([
            'services.bouquet.provider' => 'cloudflare',
            'services.bouquet.cf_account_id' => '',
            'services.bouquet.cf_token' => 'test-api-token',
        ]);
        $this->app->forgetInstance(BouquetImageGenerator::class);

        $this->expectException(\RuntimeException::class);

        app(BouquetImageGenerator::class);
    }

    public function test_cloudflare_provider_with_empty_token_throws(): void
    {
        config([
            'services.bouquet.provider' => 'cloudflare',
            'services.bouquet.cf_account_id' => 'test-account-id',
            'services.bouquet.cf_token' => '',
        ]);
        $this->app->forgetInstance(BouquetImageGenerator::class);

        $this->expectException(\RuntimeException::class);

        app(BouquetImageGenerator::class);
    }

    public function test_cloudflare_generator_returns_generated_image_on_success(): void
    {
        $fakeBytes = 'fake-jpeg-bytes-for-test';
        $fakeBase64 = base64_encode($fakeBytes);

        Http::fake([
            'api.cloudflare.com/*' => Http::response(
                ['result' => ['image' => $fakeBase64], 'success' => true, 'errors' => [], 'messages' => []],
                200
            ),
        ]);

        $generator = new CloudflareBouquetGenerator(
            accountId: 'test-account',
            apiToken: 'test-token',
        );

        $result = $generator->generate('a bouquet of roses');

        $this->assertInstanceOf(
            GeneratedImage::class,
            $result
        );
        $this->assertSame($fakeBytes, $result->bytes);
        $this->assertSame('image/jpeg', $result->mimeType);

        Http::assertSent(function ($request) {
            $body = $request->data();

            return str_contains($request->url(), 'api.cloudflare.com')
                && str_contains($request->url(), 'flux-1-schnell')
                && ($body['steps'] ?? null) === 4;
        });
    }

    public function test_cloudflare_generator_sends_only_prompt_and_steps(): void
    {
        Http::fake([
            'api.cloudflare.com/*' => Http::response(
                ['result' => ['image' => base64_encode('bytes')], 'success' => true, 'errors' => [], 'messages' => []],
                200
            ),
        ]);

        $generator = new CloudflareBouquetGenerator(
            accountId: 'test-account',
            apiToken: 'test-token',
        );

        $generator->generate('a bouquet of roses');

        Http::assertSent(function ($request) {
            $keys = array_keys($request->data());
            sort($keys);

            return $keys === ['prompt', 'steps'];
        });
    }

    public function test_cloudflare_generator_throws_on_non_200_response(): void
    {
        Http::fake([
            'api.cloudflare.com/*' => Http::response(
                ['success' => false, 'errors' => [['message' => 'Unauthorized']]],
                401
            ),
        ]);

        $generator = new CloudflareBouquetGenerator(
            accountId: 'test-account',
            apiToken: 'bad-token',
        );

        $this->expectException(
            BouquetGenerationException::class
        );

        $generator->generate('a bouquet of tulips');
    }
}
