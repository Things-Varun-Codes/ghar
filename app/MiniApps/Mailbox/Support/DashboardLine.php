<?php

namespace App\MiniApps\Mailbox\Support;

use App\Shell\Models\User;

final class DashboardLine
{
    public static function forUser(User $user): string
    {
        $summary = MailboxSummary::forUser($user);

        $unread = $summary['unread_messages'];
        $challans = $summary['challans_action_needed'];

        $parts = [];

        if ($unread > 0) {
            $parts[] = $unread.' unread '.($unread === 1 ? 'note' : 'notes');
        }

        if ($challans > 0) {
            $parts[] = $challans.' '.($challans === 1 ? 'challan' : 'challans').' to pay';
        }

        return $parts === [] ? 'All caught up' : implode(' · ', $parts);
    }
}
