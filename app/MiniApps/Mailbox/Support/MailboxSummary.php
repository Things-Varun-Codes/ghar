<?php

namespace App\MiniApps\Mailbox\Support;

use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Models\Postcard;
use App\Shell\Models\User;

/** An entry type that is off counts as nothing. */
class MailboxSummary
{
    /**
     * @return array{
     *     counts: array{messages: int, citations: int, postcards: int, coupons: int},
     *     unread_messages: int,
     *     unread_postcards: int,
     *     citations_action_needed: int,
     *     coupons_action_needed: int,
     * }
     */
    public static function forUser(User $user): array
    {
        $postcards = EntryTypes::on(EntryTypes::POSTCARDS);
        $coupons = EntryTypes::on(EntryTypes::COUPONS);

        return [
            'counts' => [
                'messages' => EntryTypes::on(EntryTypes::MESSAGES) ? MailboxMessage::query()->receivedBy($user)->count() : 0,
                'citations' => EntryTypes::on(EntryTypes::CITATIONS) ? Citation::query()->receivedBy($user)->count() : 0,
                'postcards' => $postcards ? Postcard::query()->receivedBy($user)->count() : 0,
                'coupons' => $coupons ? Coupon::query()->receivedBy($user)->count() : 0,
            ],
            'unread_messages' => EntryTypes::on(EntryTypes::MESSAGES) ? MailboxMessage::query()->unreadBy($user)->count() : 0,
            'unread_postcards' => $postcards ? Postcard::query()->unreadBy($user)->count() : 0,
            'citations_action_needed' => EntryTypes::on(EntryTypes::CITATIONS)
                ? Citation::query()->receivedBy($user)->where('status', Citation::STATUS_ISSUED)->count()
                : 0,
            'coupons_action_needed' => $coupons
                ? Coupon::query()->issuedBy($user)->where('status', Coupon::STATUS_REQUESTED)->count()
                : 0,
        ];
    }
}
