<?php

namespace App\MiniApps\Mailbox\Services;

use App\MiniApps\Mailbox\Contracts\ImageGenerator;
use App\MiniApps\Mailbox\DTOs\GeneratedImage;
use App\MiniApps\Mailbox\Exceptions\ImageGenerationException;
use App\MiniApps\Mailbox\Exceptions\ImageSafetyException;
use Illuminate\Support\Facades\Http;
use Throwable;

/** Any server that answers OpenAI's `POST /images/generations`. */
class OpenAiImageGenerator implements ImageGenerator
{
    private const REFUSALS = ['content_policy_violation', 'moderation_blocked'];

    public function __construct(
        private readonly string $url,
        private readonly ?string $key,
        private readonly string $model,
        private readonly ?string $size = null,
    ) {}

    /** Every failure but a refusal is reported before it is thrown: callers answer generically. */
    public function generate(string $prompt): GeneratedImage
    {
        $body = ['model' => $this->model, 'prompt' => $prompt, 'n' => 1];

        // OpenAI's gpt-image models always answer in base64 and reject the parameter; everything
        // else answers with a URL unless asked.
        if (! str_starts_with($this->model, 'gpt-image')) {
            $body['response_format'] = 'b64_json';
        }

        if (filled($this->size)) {
            $body['size'] = $this->size;
        }

        try {
            $request = Http::timeout(60)->acceptJson();
            $response = (filled($this->key) ? $request->withToken($this->key) : $request)
                ->post(rtrim($this->url, '/').'/images/generations', $body);
        } catch (Throwable $e) {
            report($e);
            throw new ImageGenerationException('Image API call failed: '.$e->getMessage(), 0, $e);
        }

        if (in_array($response->json('error.code'), self::REFUSALS, true)) {
            throw new ImageSafetyException('That prompt was turned down by the image model. Try wording it differently.');
        }

        if (! $response->successful()) {
            $e = new ImageGenerationException("Image API returned HTTP {$response->status()}: ".$response->body());
            report($e);
            throw $e;
        }

        $bytes = base64_decode((string) $response->json('data.0.b64_json'), strict: true);

        if ($bytes === false || $bytes === '') {
            $e = new ImageGenerationException('No base64 image in the image API response');
            report($e);
            throw $e;
        }

        return new GeneratedImage(
            bytes: $bytes,
            // @: emits a notice for bytes it can't parse; storing rejects those anyway.
            mimeType: (@getimagesizefromstring($bytes) ?: [])['mime'] ?? 'image/png',
        );
    }
}
