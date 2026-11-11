<?php

namespace App\MiniApps\Mailbox\DTOs;

readonly class GeneratedImage
{
    public function __construct(
        public string $bytes,
        public string $mimeType,
    ) {}
}
