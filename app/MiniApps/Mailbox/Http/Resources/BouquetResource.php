<?php

namespace App\MiniApps\Mailbox\Http\Resources;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\Shell\Models\User;
use App\Shell\Support\SignedUrls;
use Illuminate\Support\Carbon;

class BouquetResource
{
    public function __construct(
        private readonly SignedUrls $signedUrls,
    ) {}

    /**
     * @return array{
     *     id: int,
     *     note: string|null,
     *     image_url: string,
     *     flowers: array<int, array{key: string, name: string, meaning: string}>,
     *     posted_at: string,
     *     posted_at_human: string,
     *     read_at: string|null,
     *     is_unread: bool,
     *     is_mine: bool,
     *     sender: array{id: int, name: string},
     *     recipients: list<array{id: int, name: string}>,
     * }
     */
    public function __invoke(Bouquet $bouquet, ?User $viewer = null): array
    {
        $viewer ??= auth()->user();
        $authId = $viewer?->id;
        $bouquet->loadMissing(['sender', 'recipients']);
        $ownRow = $bouquet->recipients->firstWhere('id', $authId);
        $readAt = $ownRow?->getRelation('pivot')->getAttribute('read_at');

        $imageUrl = $this->signedUrls->forDiskObject(config('services.bouquet.disk'), $bouquet->image_key);

        return [
            'id' => $bouquet->id,
            'note' => $bouquet->note,
            'image_url' => $imageUrl,
            'flowers' => $bouquet->flowers,
            'posted_at' => $bouquet->posted_at->toIso8601String(),
            'posted_at_human' => $bouquet->posted_at->diffForHumans(),
            'read_at' => $readAt !== null ? Carbon::parse($readAt)->toIso8601String() : null,
            'is_unread' => $ownRow !== null && $readAt === null,
            'is_mine' => $bouquet->sender_id === $authId,
            'sender' => [
                'id' => $bouquet->sender->id,
                'name' => $bouquet->sender->name,
            ],
            'recipients' => $bouquet->recipients
                ->map(fn (User $user): array => ['id' => $user->id, 'name' => $user->name])
                ->values()
                ->all(),
        ];
    }
}
