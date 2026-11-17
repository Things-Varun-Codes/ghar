<?php

namespace App\MiniApps\Mailbox\Support;

use App\Shell\Models\User;

final class DashboardLine
{
    public static function forUser(User $user): string
    {
        $summary = MailboxSummary::needsAttention($user);

        $unread = $summary['unread_messages'];
        $citations = $summary['citations_action_needed'];

        $parts = [];

        if ($unread > 0) {
            $parts[] = $unread.' unread '.($unread === 1 ? 'note' : 'notes');
        }

        if ($citations > 0) {
            $parts[] = $citations.' '.($citations === 1 ? 'citation' : 'citations').' to pay';
        }

        return $parts === [] ? 'All caught up' : implode(' · ', $parts);
    }
}
