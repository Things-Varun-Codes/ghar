<?php

namespace App\MiniApps\Mailbox\Support;

use App\Shell\Models\User;

/**
 * Showing a note here doesn't mark it read.
 */
final class DashboardPreview
{
    /** @return array{note: string, note_from: string}|null */
    public static function forUser(User $user): ?array
    {
        $note = MailboxPeeks::latestNote($user);

        if ($note === null) {
            return null;
        }

        return [
            'note' => $note['body'],
            'note_from' => 'From '.$note['from'],
        ];
    }
}
