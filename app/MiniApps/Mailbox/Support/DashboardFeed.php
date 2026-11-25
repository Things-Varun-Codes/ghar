<?php

namespace App\MiniApps\Mailbox\Support;

use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Models\Postcard;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\Person;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Home's "Needs you" rows from the Exchange: only things addressed to the viewer or waiting on
 * them, so nothing private reaches anyone else. Notes and postcards say who, never what; a debt
 * says who, never how much or for what.
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

        if (EntryTypes::on(EntryTypes::EXPENSES)) {
            $payments = ExpenseBalances::paymentsOf($user);
            $owed = array_slice(array_keys(array_filter(ExpenseBalances::overview($user, $payments), fn (int $net): bool => $net < 0)), 0, self::LIMIT);
            $latest = $owed === [] ? [] : self::latestExpenseIn(array_column($payments, 'group_id'), $user);

            foreach ($owed === [] ? [] : User::query()->whereKey($owed)->orderBy('name')->get() as $person) {
                // Dated by the newest expense the viewer is on in a group where the two have a debt.
                $at = max([...array_map(
                    fn (array $payment): string => in_array($person->id, [$payment['from'], $payment['to']], true) ? ($latest[$payment['group_id']] ?? '') : '',
                    $payments,
                ), '']);

                $entries[] = self::needs(
                    'You owe '.app(Household::class)->shortName($person),
                    'Shared expenses',
                    ($at === '' ? now() : Carbon::parse($at, 'UTC'))->toIso8601String(),
                    route('apps.our-exchange.expenses.index', absolute: false),
                    'Settle',
                    $person,
                );
            }
        }

        return $entries;
    }

    /**
     * @param  array<int, int>  $groupIds
     * @return array<int, string> group id => when the newest live expense the viewer is on was added
     */
    private static function latestExpenseIn(array $groupIds, User $user): array
    {
        return Expense::query()
            ->whereIn('group_id', $groupIds)
            ->where(fn ($on) => $on
                ->where('paid_by_id', $user->id)
                ->orWhereIn('id', DB::table('mailbox_expense_shares')->where('user_id', $user->id)->select('expense_id')))
            ->groupBy('group_id')
            ->selectRaw('group_id, max(created_at) as latest')
            ->toBase()
            ->pluck('latest', 'group_id')
            ->all();
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
