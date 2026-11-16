<?php

namespace App\MiniApps\Mailbox\Support;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;

class MailboxSummary
{
    /**
     * @return array{
     *     counts: array{messages: int, citations: int, flowers: int, coupons: int},
     *     unread_messages: int,
     *     unread_flowers: int,
     *     citations_action_needed: int,
     *     coupons_action_needed: int,
     * }
     */
    public static function forUser(User $user): array
    {
        $messagesCount = MailboxMessage::query()->receivedBy($user)->count();
        $unread = MailboxMessage::query()->unreadBy($user)->count();

        $citationsCount = Citation::where('recipient_id', $user->id)->count();

        $citationsActionNeeded = Citation::where('recipient_id', $user->id)
            ->where('status', Citation::STATUS_ISSUED)
            ->count();

        $flowersCount = Bouquet::query()->receivedBy($user)->count();
        $unreadFlowers = Bouquet::query()->unreadBy($user)->count();

        $couponsCount = Coupon::where('recipient_id', $user->id)->count();

        $couponsActionNeeded = Coupon::where('issuer_id', $user->id)
            ->where('status', Coupon::STATUS_REQUESTED)
            ->count();

        return [
            'counts' => [
                'messages' => $messagesCount,
                'citations' => $citationsCount,
                'flowers' => $flowersCount,
                'coupons' => $couponsCount,
            ],
            'unread_messages' => $unread,
            'unread_flowers' => $unreadFlowers,
            'citations_action_needed' => $citationsActionNeeded,
            'coupons_action_needed' => $couponsActionNeeded,
        ];
    }
}
