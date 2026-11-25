<?php

namespace App\MiniApps\Mailbox\Support;

use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Models\Postcard;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\Person;

/**
 * Home's "Needs you" rows from the Exchange: only things addressed to the viewer or waiting on
 * them, so nothing private reaches anyone else. Notes and postcards say who, never what.
 */
final class DashboardFeed
{
    private const LIMIT = 6;

    /** @return list<array<string, mixed>> */
    public static function forUser(User $user): array
    {
        $entries = [];

        if (EntryTypes::on(EntryTypes::CITATIONS)) {
            foreach (Citation::query()->receivedBy($user)->where('status', Citation::STATUS_ISSUED)->with('issuer')->latest('issued_at')->limit(self::LIMIT)->get() as $citation) {
                $entries[] = self::needs(
                    'Citation from '.app(Household::class)->shortName($citation->issuer),
                    $citation->offence,
                    $citation->issued_at->toIso8601String(),
                    route('apps.our-exchange.citations.show', $citation, absolute: false),
                    'Pay',
                    $citation->issuer,
                    quoted: true,
                );
            }
        }

        if (EntryTypes::on(EntryTypes::COUPONS)) {
            foreach (Coupon::query()->issuedBy($user)->where('status', Coupon::STATUS_REQUESTED)->with('recipient')->latest('requested_at')->limit(self::LIMIT)->get() as $coupon) {
                $entries[] = self::needs(
                    app(Household::class)->shortName($coupon->recipient).' wants to use a coupon',
                    $coupon->title,
                    ($coupon->requested_at ?? $coupon->created_at)->toIso8601String(),
                    route('apps.our-exchange.coupons.show', $coupon, absolute: false),
                    'Answer',
                    $coupon->recipient,
                    quoted: true,
                );
            }
        }

        if (EntryTypes::on(EntryTypes::MESSAGES)) {
            foreach (MailboxMessage::query()->unreadBy($user)->with('sender')->latest('id')->limit(self::LIMIT)->get() as $message) {
                $entries[] = self::needs(
                    'A note from '.app(Household::class)->shortName($message->sender),
                    // Says nothing of what it holds: a note stays a surprise until it is opened.
                    'Not opened yet',
                    $message->created_at->toIso8601String(),
                    route('apps.our-exchange.messages.index', absolute: false),
                    'Read',
                    $message->sender,
                );
            }
        }

        if (EntryTypes::on(EntryTypes::POSTCARDS)) {
            foreach (Postcard::query()->unreadBy($user)->with('sender')->latest('id')->limit(self::LIMIT)->get() as $postcard) {
                $entries[] = self::needs(
                    'A postcard from '.app(Household::class)->shortName($postcard->sender),
                    'Not opened yet',
                    $postcard->created_at->toIso8601String(),
                    route('apps.our-exchange.postcards.index', absolute: false),
                    'Open',
                    $postcard->sender,
                );
            }
        }

        return $entries;
    }

    /** @return array<string, mixed> */
    private static function needs(string $title, ?string $detail, string $at, string $href, string $action, User $person, bool $quoted = false): array
    {
        return [
            // What the sender filled in, which Home sets in italic.
            'quoted' => $quoted,
            'kind' => 'needs',
            'title' => $title,
            'detail' => $detail,
            'at' => $at,
            'href' => $href,
            'action' => $action,
            'person' => Person::short($person),
            'image' => null,
        ];
    }
}
