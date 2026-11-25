<?php

namespace App\MiniApps\Mailbox\Services;

use App\MiniApps\Mailbox\Contracts\ImageGenerator;
use App\MiniApps\Mailbox\DTOs\GeneratedImage;

class FakeImageGenerator implements ImageGenerator
{
    public function generate(string $prompt): GeneratedImage
    {
        $path = public_path('img/placeholder-postcard.jpg');

        if (! file_exists($path)) {
            throw new \RuntimeException(
                "FakeImageGenerator: placeholder asset missing at {$path}. ".
                'Ensure it is committed and checked out.'
            );
        }

        return new GeneratedImage(
            bytes: file_get_contents($path),
            mimeType: 'image/jpeg',
        );
    }
}
