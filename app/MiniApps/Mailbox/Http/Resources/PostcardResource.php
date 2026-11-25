<?php

namespace App\MiniApps\Mailbox\Http\Resources;

use App\MiniApps\Mailbox\Http\Resources\Concerns\DescribesSentToMany;
use App\MiniApps\Mailbox\Models\Postcard;
use App\Shell\Models\User;
use App\Shell\Support\SignedUrls;

class PostcardResource
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
     *     prompt: string|null,
     *     posted_at: string,
     *     posted_at_human: string,
     *     read_at: string|null,
     *     is_unread: bool,
     *     is_mine: bool,
     *     sender: array{id: int, name: string, avatar_url: string|null},
     *     recipients: list<array{id: int, name: string, avatar_url: string|null}>,
     * }
     */
    public function __invoke(Postcard $postcard, ?User $viewer = null): array
    {
        $viewer ??= auth()->user();
        $imageUrl = $this->signedUrls->forDiskObject(config('services.image_ai.disk'), $postcard->image_key);

        return [
            'id' => $postcard->id,
            'note' => $postcard->note,
            'image_url' => $imageUrl,
            'prompt' => $postcard->prompt,
            ...$this->delivery($postcard, $viewer),
        ];
    }
}
