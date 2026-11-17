<?php

namespace App\MiniApps\Mailbox\Support;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;

/** An entry type that is off counts as nothing. */
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
        $flowers = EntryTypes::on(EntryTypes::FLOWERS);
        $coupons = EntryTypes::on(EntryTypes::COUPONS);
        $attention = self::needsAttention($user);

        return [
            'counts' => [
                'messages' => EntryTypes::on(EntryTypes::MESSAGES) ? MailboxMessage::query()->receivedBy($user)->count() : 0,
                'citations' => EntryTypes::on(EntryTypes::CITATIONS) ? Citation::query()->receivedBy($user)->count() : 0,
                'flowers' => $flowers ? Bouquet::query()->receivedBy($user)->count() : 0,
                'coupons' => $coupons ? Coupon::query()->receivedBy($user)->count() : 0,
            ],
            'unread_messages' => $attention['unread_messages'],
            'unread_flowers' => $flowers ? Bouquet::query()->unreadBy($user)->count() : 0,
            'citations_action_needed' => $attention['citations_action_needed'],
            'coupons_action_needed' => $coupons
                ? Coupon::query()->issuedBy($user)->where('status', Coupon::STATUS_REQUESTED)->count()
                : 0,
        ];
    }

    /**
     * Just what Home's door line reads.
     *
     * @return array{unread_messages: int, citations_action_needed: int}
     */
    public static function needsAttention(User $user): array
    {
        return [
            'unread_messages' => EntryTypes::on(EntryTypes::MESSAGES)
                ? MailboxMessage::query()->unreadBy($user)->count()
                : 0,
            'citations_action_needed' => EntryTypes::on(EntryTypes::CITATIONS)
                ? Citation::query()->receivedBy($user)->where('status', Citation::STATUS_ISSUED)->count()
                : 0,
        ];
    }
}
