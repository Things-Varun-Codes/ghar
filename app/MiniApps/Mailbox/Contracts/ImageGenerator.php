<?php

namespace App\MiniApps\Mailbox\Contracts;

use App\MiniApps\Mailbox\DTOs\GeneratedImage;

interface ImageGenerator
{
    public function generate(string $prompt): GeneratedImage;
}
