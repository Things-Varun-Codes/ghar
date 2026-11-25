<?php

namespace App\MiniApps\Mailbox\Services;

use App\MiniApps\Mailbox\Contracts\ImageGenerator;
use App\MiniApps\Mailbox\DTOs\GeneratedImage;
use App\MiniApps\Mailbox\Exceptions\ImageGenerationException;
use Illuminate\Support\Facades\Http;
use Throwable;

class CloudflareImageGenerator implements ImageGenerator
{
    public function __construct(
        private readonly string $url,
        private readonly string $apiToken,
        private readonly string $model,
    ) {}

    /**
     * Every failure path calls report() before throwing, so the generator's failures reach
     * error tracking even though callers turn them into a generic response.
     */
    public function generate(string $prompt): GeneratedImage
    {
        $endpoint = rtrim($this->url, '/').'/'.$this->model;

        try {
            $response = Http::timeout(60)
                ->withToken($this->apiToken)
                ->post($endpoint, [
                    'prompt' => $prompt,
                    'steps' => 4,
                ]);
        } catch (Throwable $e) {
            report($e);
            throw new ImageGenerationException(
                'Cloudflare API call failed: '.$e->getMessage(),
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            $e = new ImageGenerationException(
                "Cloudflare returned HTTP {$response->status()}: ".$response->body()
            );
            report($e);
            throw $e;
        }

        $imageBase64 = $response->json('result.image');

        if ($response->json('success') !== true || empty($imageBase64)) {
            $e = new ImageGenerationException('No image in Cloudflare response');
            report($e);
            throw $e;
        }

        return new GeneratedImage(
            bytes: base64_decode($imageBase64),
            mimeType: 'image/jpeg',
        );
    }
}
