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
     * An entry type that is off counts as nothing.
     *
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
        $messages = EntryTypes::on(EntryTypes::MESSAGES);
        $flowers = EntryTypes::on(EntryTypes::FLOWERS);
        $citations = EntryTypes::on(EntryTypes::CITATIONS);
        $coupons = EntryTypes::on(EntryTypes::COUPONS);

        return [
            'counts' => [
                'messages' => $messages ? MailboxMessage::query()->receivedBy($user)->count() : 0,
                'citations' => $citations ? Citation::where('recipient_id', $user->id)->count() : 0,
                'flowers' => $flowers ? Bouquet::query()->receivedBy($user)->count() : 0,
                'coupons' => $coupons ? Coupon::where('recipient_id', $user->id)->count() : 0,
            ],
            'unread_messages' => $messages ? MailboxMessage::query()->unreadBy($user)->count() : 0,
            'unread_flowers' => $flowers ? Bouquet::query()->unreadBy($user)->count() : 0,
            'citations_action_needed' => $citations
                ? Citation::where('recipient_id', $user->id)->where('status', Citation::STATUS_ISSUED)->count()
                : 0,
            'coupons_action_needed' => $coupons
                ? Coupon::where('issuer_id', $user->id)->where('status', Coupon::STATUS_REQUESTED)->count()
                : 0,
        ];
    }
}
