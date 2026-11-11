<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\Song;
use App\MiniApps\Corner\Services\OEmbedFetcher;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateSongLink
{
    public function __construct(
        private readonly OEmbedFetcher $oembed,
    ) {}

    public function __invoke(Song $song, string $url): Song
    {
        $meta = $this->oembed->fetch($url);

        try {
            return DB::transaction(function () use ($song, $url, $meta): Song {
                $song->update([
                    'provider' => $meta['provider'] ?? 'unknown',
                    'provider_id' => $meta['provider_id'] ?? hash('xxh64', $url),
                    'url' => $url,
                    'title' => $meta['title'] ?? $url,
                    'author' => $meta['author'] ?? null,
                    'thumbnail_url' => $meta['thumbnail_url'] ?? null,
                ]);

                return $song;
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages([
                'url' => 'That song is already in your list.',
            ]);
        }
    }
}
