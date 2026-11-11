<?php

namespace App\MiniApps\Mailbox\Services;

use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\MiniApps\Mailbox\DTOs\GeneratedImage;
use App\MiniApps\Mailbox\Exceptions\BouquetGenerationException;
use Illuminate\Support\Facades\Http;
use Throwable;

class CloudflareBouquetGenerator implements BouquetImageGenerator
{
    public function __construct(
        private readonly string $accountId,
        private readonly string $apiToken,
        private readonly string $model = '@cf/black-forest-labs/flux-1-schnell',
    ) {}

    /**
     * Every failure path calls report() before throwing, so the generator's failures reach
     * error tracking even though callers turn them into a generic response.
     */
    public function generate(string $prompt): GeneratedImage
    {
        $endpoint = 'https://api.cloudflare.com/client/v4/accounts/'
            .$this->accountId
            .'/ai/run/'
            .$this->model;

        try {
            $response = Http::timeout(60)
                ->withToken($this->apiToken)
                ->post($endpoint, [
                    'prompt' => $prompt,
                    'steps' => 4,
                ]);
        } catch (Throwable $e) {
            report($e);
            throw new BouquetGenerationException(
                'Cloudflare API call failed: '.$e->getMessage(),
                0,
                $e,
            );
        }

        if (! $response->successful()) {
            $e = new BouquetGenerationException(
                "Cloudflare returned HTTP {$response->status()}: ".$response->body()
            );
            report($e);
            throw $e;
        }

        $imageBase64 = $response->json('result.image');

        if ($response->json('success') !== true || empty($imageBase64)) {
            $e = new BouquetGenerationException('No image in Cloudflare response');
            report($e);
            throw $e;
        }

        return new GeneratedImage(
            bytes: base64_decode($imageBase64),
            mimeType: 'image/jpeg',
        );
    }
}
