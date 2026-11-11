<?php

namespace App\MiniApps\Mailbox\Contracts;

use App\MiniApps\Mailbox\DTOs\GeneratedImage;

interface BouquetImageGenerator
{
    public function generate(string $prompt): GeneratedImage;
}
