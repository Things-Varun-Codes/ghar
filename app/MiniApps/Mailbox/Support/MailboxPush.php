<?php

namespace App\MiniApps\Mailbox\Support;

use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;

/**
 * Callers send on the line after their transaction returns, so a rolled-back write sends nothing.
 */
final class MailboxPush
{
    public function __construct(
        private readonly PushDispatcher $dispatcher,
    ) {}

    /**
     * Opens the entry's own page (citations, coupons).
     *
     * @param  iterable<User>  $recipients
     */
    public function toEntry(iterable $recipients, string $type, int $id, string $body): void
    {
        $this->send($recipients, $type, $body, "/{$type}/{$id}");
    }

    /**
     * Opens the type's list at the entry (notes, postcards).
     *
     * @param  iterable<User>  $recipients
     */
    public function toListAt(iterable $recipients, string $type, int $id, string $body): void
    {
        $this->send($recipients, $type, $body, "/{$type}?focus={$id}");
    }

    /**
     * Opens the expense's group at the expense.
     *
     * @param  iterable<User>  $recipients
     */
    public function toExpense(iterable $recipients, int $groupId, int $id, string $body): void
    {
        $this->send($recipients, EntryTypes::EXPENSES, $body, "/expenses/groups/{$groupId}?focus={$id}");
    }

    /** @param  iterable<User>  $recipients */
    private function send(iterable $recipients, string $type, string $body, string $path): void
    {
        $this->dispatcher->toUsers(
            $recipients,
            EntryTypes::ROOM,
            EntryTypes::ROOM.':'.$type,
            $body,
            '/apps/'.EntryTypes::ROOM.$path,
        );
    }
}
