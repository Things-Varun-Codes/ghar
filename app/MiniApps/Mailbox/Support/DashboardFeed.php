<?php

namespace App\MiniApps\Mailbox\Support;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\Person;

/**
 * Home's "Needs you" rows from the Exchange: only things addressed to the viewer or waiting on
 * them, so nothing private reaches anyone else. Notes and flowers say who, never what.
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

        if (EntryTypes::on(EntryTypes::FLOWERS)) {
            foreach (Bouquet::query()->unreadBy($user)->with('sender')->latest('id')->limit(self::LIMIT)->get() as $bouquet) {
                $entries[] = self::needs(
                    'Flowers from '.app(Household::class)->shortName($bouquet->sender),
                    self::flowerNames($bouquet),
                    $bouquet->created_at->toIso8601String(),
                    route('apps.our-exchange.flowers.index', absolute: false),
                    'Open',
                    $bouquet->sender,
                );
            }
        }

        return $entries;
    }

    /** What's in the bouquet, never its note: the note is read on its own page. */
    private static function flowerNames(Bouquet $bouquet): ?string
    {
        $names = array_values(array_filter(array_map(
            fn (mixed $flower): ?string => is_array($flower) && is_string($flower['name'] ?? null) ? $flower['name'] : null,
            $bouquet->flowers,
        )));

        return $names === [] ? null : implode(', ', $names);
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
            'person' => Person::of($person),
            'image' => null,
        ];
    }
}
