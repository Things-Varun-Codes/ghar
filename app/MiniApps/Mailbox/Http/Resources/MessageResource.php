<?php

namespace App\MiniApps\Mailbox\Http\Resources;

use App\MiniApps\Mailbox\Http\Resources\Concerns\DescribesSentToMany;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;

class MessageResource
{
    use DescribesSentToMany;

    /**
     * @return array{
     *     id: int,
     *     body: string,
     *     posted_at: string,
     *     posted_at_human: string,
     *     read_at: string|null,
     *     is_unread: bool,
     *     is_mine: bool,
     *     sender: array{id: int, name: string, avatar_url: string|null},
     *     recipients: list<array{id: int, name: string, avatar_url: string|null}>,
     * }
     */
    public function __invoke(MailboxMessage $message, ?User $viewer = null): array
    {
        $viewer ??= auth()->user();

        return [
            'id' => $message->id,
            'body' => $message->body,
            ...$this->delivery($message, $viewer),
        ];
    }
}
