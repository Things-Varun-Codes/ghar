<?php

namespace App\MiniApps\Corner\Services;

final class FetchedResponse
{
    public function __construct(
        /** Where the answer came from, after any redirects. */
        public readonly string $url,
        public readonly string $contentType,
        public readonly string $body,
    ) {}
}
