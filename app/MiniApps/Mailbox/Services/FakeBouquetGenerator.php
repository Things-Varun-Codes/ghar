<?php

namespace App\MiniApps\Mailbox\Services;

use App\MiniApps\Mailbox\Contracts\BouquetImageGenerator;
use App\MiniApps\Mailbox\DTOs\GeneratedImage;

class FakeBouquetGenerator implements BouquetImageGenerator
{
    public function generate(string $prompt): GeneratedImage
    {
        $path = public_path('img/placeholder-bouquet.jpg');

        if (! file_exists($path)) {
            throw new \RuntimeException(
                "FakeBouquetGenerator: placeholder asset missing at {$path}. ".
                'Ensure public/img/placeholder-bouquet.jpg is committed and checked out.'
            );
        }

        return new GeneratedImage(
            bytes: file_get_contents($path),
            mimeType: 'image/jpeg',
        );
    }
}
