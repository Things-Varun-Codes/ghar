<?php

namespace App\MiniApps\Corner\Services;

class MoviePosterResolver
{
    public function __construct(
        private readonly PlexMetadataFetcher $fetcher,
    ) {}

    public function __invoke(?string $plexUrl): ?string
    {
        $plexUrl = trim((string) $plexUrl);

        if ($plexUrl === '') {
            return null;
        }

        $meta = $this->fetcher->fetch($plexUrl);

        return $meta['poster_url'] ?? null;
    }
}
