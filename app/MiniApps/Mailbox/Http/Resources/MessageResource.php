<?php

namespace App\MiniApps\Mailbox\Http\Resources;

use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use Illuminate\Support\Carbon;

class MessageResource
{
    /**
     * @return array{
     *     id: int,
     *     body: string,
     *     posted_at: string,
     *     posted_at_human: string,
     *     read_at: string|null,
     *     is_unread: bool,
     *     is_mine: bool,
     *     sender: array{id: int, name: string},
     *     recipients: list<array{id: int, name: string}>,
     * }
     */
    public function __invoke(MailboxMessage $message, ?User $viewer = null): array
    {
        $viewer ??= auth()->user();
        $authId = $viewer?->id;
        $message->loadMissing(['sender', 'recipients']);
        $ownRow = $message->recipients->firstWhere('id', $authId);
        $readAt = $ownRow?->getRelation('pivot')->getAttribute('read_at');

        return [
            'id' => $message->id,
            'body' => $message->body,
            'posted_at' => $message->posted_at->toIso8601String(),
            'posted_at_human' => $message->posted_at->diffForHumans(),
            'read_at' => $readAt !== null ? Carbon::parse($readAt)->toIso8601String() : null,
            'is_unread' => $ownRow !== null && $readAt === null,
            'is_mine' => $message->sender_id === $authId,
            'sender' => [
                'id' => $message->sender->id,
                'name' => $message->sender->name,
            ],
            'recipients' => $message->recipients
                ->map(fn (User $user): array => ['id' => $user->id, 'name' => $user->name])
                ->values()
                ->all(),
        ];
    }
}
