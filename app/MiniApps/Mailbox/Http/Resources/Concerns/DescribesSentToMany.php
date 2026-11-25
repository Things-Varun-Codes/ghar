<?php

namespace App\MiniApps\Mailbox\Http\Resources\Concerns;

use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Models\Postcard;
use App\Shell\Models\User;
use App\Shell\Support\Person;
use Illuminate\Support\Carbon;

trait DescribesSentToMany
{
    /**
     * @return array{
     *     posted_at: string,
     *     posted_at_human: string,
     *     read_at: string|null,
     *     is_unread: bool,
     *     is_mine: bool,
     *     sender: array{id: int, name: string, avatar_url: string|null},
     *     recipients: list<array{id: int, name: string, avatar_url: string|null}>,
     * }
     */
    private function delivery(MailboxMessage|Postcard $entry, ?User $viewer): array
    {
        $authId = $viewer?->id;
        $entry->loadMissing(['sender', 'recipients']);
        $ownRow = $entry->recipients->firstWhere('id', $authId);
        $readAt = $ownRow?->getRelation('pivot')->getAttribute('read_at');

        return [
            'posted_at' => $entry->posted_at->toIso8601String(),
            'posted_at_human' => $entry->posted_at->diffForHumans(),
            'read_at' => $readAt !== null ? Carbon::parse($readAt)->toIso8601String() : null,
            'is_unread' => $ownRow !== null && $readAt === null,
            'is_mine' => $entry->sender_id === $authId,
            'sender' => Person::short($entry->sender),
            'recipients' => $entry->recipients
                ->map(fn (User $user): array => Person::short($user))
                ->values()
                ->all(),
        ];
    }
}
