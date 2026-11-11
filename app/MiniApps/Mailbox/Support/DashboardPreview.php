<?php

namespace App\MiniApps\Mailbox\Support;

use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use Illuminate\Support\Str;

/**
 * Showing a note here doesn't mark it read.
 */
final class DashboardPreview
{
    private const NOTE_LIMIT = 140;

    /** @return array{note: string, note_from: string}|null */
    public static function forUser(User $user): ?array
    {
        $note = MailboxMessage::query()
            ->receivedBy($user)
            ->with('sender')
            ->orderByDesc('posted_at')
            ->orderByDesc('id')
            ->first();

        if ($note === null || trim((string) $note->body) === '') {
            return null;
        }

        return [
            'note' => Str::limit(trim((string) $note->body), self::NOTE_LIMIT),
            'note_from' => 'From '.$note->sender->name,
        ];
    }
}
