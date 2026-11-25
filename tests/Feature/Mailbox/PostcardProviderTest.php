<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Contracts\ImageGenerator;
use App\MiniApps\Mailbox\DTOs\GeneratedImage;
use App\MiniApps\Mailbox\Exceptions\ImageGenerationException;
use App\MiniApps\Mailbox\Exceptions\ImageSafetyException;
use App\MiniApps\Mailbox\Services\CloudflareImageGenerator;
use App\MiniApps\Mailbox\Services\FakeImageGenerator;
use App\MiniApps\Mailbox\Services\OpenAiImageGenerator;
use App\MiniApps\Mailbox\Support\ImageAi;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PostcardProviderTest extends TestCase
{
    use RefreshDatabase;

    public function test_fake_provider_resolves_to_fake_generator(): void
    {
        config(['services.image_ai.provider' => 'fake']);
        $this->app->forgetInstance(ImageGenerator::class);

        $generator = app(ImageGenerator::class);

        $this->assertInstanceOf(
            FakeImageGenerator::class,
            $generator
        );
    }

    public function test_unset_provider_in_production_throws(): void
    {
        // Force production environment for this test.
        $this->app['env'] = 'production';

        // Clear provider config to simulate "unset in production".
        config(['services.image_ai.provider' => null]);
        $this->app->forgetInstance(ImageGenerator::class);

        $this->expectException(\RuntimeException::class);

        app(ImageGenerator::class);
    }

    public function test_unset_provider_in_testing_resolves_fake(): void
    {
        // No provider configured — app env is 'testing' (phpunit.xml: APP_ENV=testing).
        config(['services.image_ai.provider' => null]);
        $this->app->forgetInstance(ImageGenerator::class);

        $generator = app(ImageGenerator::class);

        $this->assertInstanceOf(
            FakeImageGenerator::class,
            $generator
        );
    }

    /** @return array<string, array{array<string, string|null>, class-string|null}> */
    public static function settings(): array
    {
        $full = ['url' => 'https://images.test/v1', 'key' => 'secret', 'model' => 'a-model'];

        return [
            'openai, complete' => [['provider' => 'openai', ...$full], OpenAiImageGenerator::class],
            'openai, no key (a local server)' => [['provider' => 'openai', ...$full, 'key' => null], OpenAiImageGenerator::class],
            'openai, no url' => [['provider' => 'openai', ...$full, 'url' => ''], null],
            'openai, no model' => [['provider' => 'openai', ...$full, 'model' => null], null],
            'cloudflare, complete' => [['provider' => 'cloudflare', ...$full], CloudflareImageGenerator::class],
            'cloudflare, no key' => [['provider' => 'cloudflare', ...$full, 'key' => ''], null],
            'an unknown provider' => [['provider' => 'dalle', ...$full], null],
        ];
    }

    /**
     * @param  array<string, string|null>  $settings
     * @param  class-string|null  $expected
     */
    #[DataProvider('settings')]
    public function test_the_settings_decide_the_generator_or_say_what_is_missing(array $settings, ?string $expected): void
    {
        config(['services.image_ai' => [...$settings, 'size' => null, 'disk' => 'local']]);

        if ($expected === null) {
            $this->assertNotNull(ImageAi::missing());
            $this->expectException(\RuntimeException::class);
        } else {
            $this->assertNull(ImageAi::missing());
        }

        $this->assertInstanceOf($expected ?? ImageGenerator::class, app(ImageGenerator::class));
    }

    public function test_what_is_missing_names_the_settings_to_add(): void
    {
        config(['services.image_ai' => ['provider' => 'openai', 'url' => null, 'key' => null, 'model' => null]]);

        $this->assertSame('Needs an image model. Still to set on the server: IMAGE_AI_URL, IMAGE_AI_MODEL.', ImageAi::missing());
    }

    public function test_openai_generator_posts_to_images_generations_and_reads_base64(): void
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
        Http::fake(['images.test/*' => Http::response(['data' => [['b64_json' => base64_encode($png)]]])]);

        $result = (new OpenAiImageGenerator('https://images.test/v1/', 'secret', 'a-model', '1024x1536'))->generate('a cat');

        $this->assertSame($png, $result->bytes);
        $this->assertSame('image/png', $result->mimeType);
        Http::assertSent(fn ($request) => $request->url() === 'https://images.test/v1/images/generations'
            && $request->hasHeader('Authorization', 'Bearer secret')
            && $request->data() === ['model' => 'a-model', 'prompt' => 'a cat', 'n' => 1, 'response_format' => 'b64_json', 'size' => '1024x1536']);
    }

    public function test_openai_generator_leaves_out_what_a_server_may_reject(): void
    {
        Http::fake(['images.test/*' => Http::response(['data' => [['b64_json' => base64_encode('bytes')]]])]);

        (new OpenAiImageGenerator('https://images.test/v1', null, 'gpt-image-1'))->generate('a cat');

        Http::assertSent(fn ($request) => $request->data() === ['model' => 'gpt-image-1', 'prompt' => 'a cat', 'n' => 1]
            && ! $request->hasHeader('Authorization'));
    }

    public function test_openai_generator_turns_a_refusal_into_a_safety_exception(): void
    {
        Http::fake(['images.test/*' => Http::response(['error' => ['code' => 'content_policy_violation', 'message' => 'no']], 400)]);

        $this->expectException(ImageSafetyException::class);

        (new OpenAiImageGenerator('https://images.test/v1', 'secret', 'a-model'))->generate('something refused');
    }

    public function test_openai_generator_throws_when_the_answer_has_no_image(): void
    {
        Http::fake(['images.test/*' => Http::response(['data' => [['url' => 'https://images.test/picture.png']]])]);

        $this->expectException(ImageGenerationException::class);

        (new OpenAiImageGenerator('https://images.test/v1', 'secret', 'a-model'))->generate('a cat');
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

        $generator = new CloudflareImageGenerator(
            url: 'https://api.cloudflare.com/client/v4/accounts/test-account/ai/run',
            apiToken: 'test-token',
            model: '@cf/black-forest-labs/flux-1-schnell',
        );

        $result = $generator->generate('a postcard of roses');

        $this->assertInstanceOf(
            GeneratedImage::class,
            $result
        );
        $this->assertSame($fakeBytes, $result->bytes);
        $this->assertSame('image/jpeg', $result->mimeType);

        Http::assertSent(function ($request) {
            $body = $request->data();

            return $request->url() === 'https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/@cf/black-forest-labs/flux-1-schnell'
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

        $generator = new CloudflareImageGenerator(
            url: 'https://api.cloudflare.com/client/v4/accounts/test-account/ai/run',
            apiToken: 'test-token',
            model: '@cf/black-forest-labs/flux-1-schnell',
        );

        $generator->generate('a postcard of roses');

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

        $generator = new CloudflareImageGenerator(
            url: 'https://api.cloudflare.com/client/v4/accounts/test-account/ai/run',
            apiToken: 'bad-token',
            model: '@cf/black-forest-labs/flux-1-schnell',
        );

        $this->expectException(
            ImageGenerationException::class
        );

        $generator->generate('a postcard of tulips');
    }
}
