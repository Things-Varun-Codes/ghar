<?php

namespace App\MiniApps\Mailbox\Http\Resources;

use App\MiniApps\Mailbox\Http\Resources\Concerns\DescribesSentToMany;
use App\MiniApps\Mailbox\Models\Bouquet;
use App\Shell\Models\User;
use App\Shell\Support\SignedUrls;

class BouquetResource
{
    use DescribesSentToMany;

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
     *     sender: array{id: int, name: string, avatar_url: string|null},
     *     recipients: list<array{id: int, name: string, avatar_url: string|null}>,
     * }
     */
    public function __invoke(Bouquet $bouquet, ?User $viewer = null): array
    {
        $viewer ??= auth()->user();
        $imageUrl = $this->signedUrls->forDiskObject(config('services.bouquet.disk'), $bouquet->image_key);

        return [
            'id' => $bouquet->id,
            'note' => $bouquet->note,
            'image_url' => $imageUrl,
            'flowers' => $bouquet->flowers,
            ...$this->delivery($bouquet, $viewer),
        ];
    }
}
