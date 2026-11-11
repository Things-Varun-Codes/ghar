<?php

namespace App\MiniApps\Corner\Actions;

use App\MiniApps\Corner\Models\Song;
use App\MiniApps\Corner\Services\OEmbedFetcher;
use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AddSong
{
    public function __construct(
        private readonly OEmbedFetcher $oembed,
        private readonly PushDispatcher $dispatcher,
    ) {}

    public function __invoke(string $url, User $adder): Song
    {
        $meta = $this->oembed->fetch($url);

        return DB::transaction(function () use ($url, $meta, $adder): Song {
            $song = Song::firstOrCreate(
                [
                    'provider' => $meta['provider'] ?? 'unknown',
                    'provider_id' => $meta['provider_id'] ?? hash('xxh64', $url),
                ],
                [
                    'url' => $url,
                    'title' => $meta['title'] ?? $url,
                    'author' => $meta['author'] ?? null,
                    'thumbnail_url' => $meta['thumbnail_url'] ?? null,
                    'added_by_user_id' => $adder->id,
                    'added_at' => now(),
                ]
            );

            if (! $song->wasRecentlyCreated) {
                throw ValidationException::withMessages([
                    'url' => 'That song is already in your list.',
                ]);
            }

            // Inside afterCommit so a rolled-back row is never pushed.
            if (config('corner-lists.songs.push_on_add', true)) {
                $firstName = $adder->firstName();
                $body = "{$firstName} added a song: {$song->title}";

                DB::afterCommit(function () use ($adder, $body): void {
                    $this->dispatcher->toHousehold(
                        $adder,
                        'our-corner',
                        'our-corner:songs',
                        $body,
                        '/apps/our-corner/songs',
                    );
                });
            }

            return $song;
        });
    }
}
