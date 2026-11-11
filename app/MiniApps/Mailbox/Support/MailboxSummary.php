<?php

namespace App\MiniApps\Mailbox\Support;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Challan;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;

class MailboxSummary
{
    /**
     * @return array{
     *     counts: array{messages: int, challans: int, flowers: int, coupons: int},
     *     unread_messages: int,
     *     unread_flowers: int,
     *     challans_action_needed: int,
     *     coupons_action_needed: int,
     *     latest_unread_preview: ?array{id: int, body: string, posted_at: string, sender_id: int},
     * }
     */
    public static function forUser(User $user): array
    {
        $messagesCount = MailboxMessage::query()->receivedBy($user)->count();
        $unread = MailboxMessage::query()->unreadBy($user)->count();

        $challansCount = Challan::where('recipient_id', $user->id)->count();

        $challansActionNeeded = Challan::where('recipient_id', $user->id)
            ->where('status', Challan::STATUS_ISSUED)
            ->count();

        $flowersCount = Bouquet::query()->receivedBy($user)->count();
        $unreadFlowers = Bouquet::query()->unreadBy($user)->count();

        $couponsCount = Coupon::where('recipient_id', $user->id)->count();

        $couponsActionNeeded = Coupon::where('issuer_id', $user->id)
            ->where('status', Coupon::STATUS_REQUESTED)
            ->count();

        $latestUnread = MailboxMessage::query()
            ->unreadBy($user)
            ->orderByDesc('posted_at')
            ->orderByDesc('id')
            ->first();

        $preview = null;
        if ($latestUnread !== null) {
            $preview = [
                'id' => $latestUnread->id,
                'body' => mb_substr($latestUnread->body, 0, 140),
                'posted_at' => $latestUnread->posted_at->toIso8601String(),
                'sender_id' => $latestUnread->sender_id,
            ];
        }

        return [
            'counts' => [
                'messages' => $messagesCount,
                'challans' => $challansCount,
                'flowers' => $flowersCount,
                'coupons' => $couponsCount,
            ],
            'unread_messages' => $unread,
            'unread_flowers' => $unreadFlowers,
            'challans_action_needed' => $challansActionNeeded,
            'coupons_action_needed' => $couponsActionNeeded,
            'latest_unread_preview' => $preview,
        ];
    }
}
