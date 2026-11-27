<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseActivity;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\MiniApps\Mailbox\Support\ExpenseBalances;
use App\MiniApps\Mailbox\Support\ExpenseMath;
use App\MiniApps\Mailbox\Support\MailboxPush;
use App\Shell\Models\User;
use App\Shell\Support\Region;
use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Every write to a group's expenses. Each one locks the group's row first, so two writes to the
 * same group run one after the other and each sees the other's result; each writes its activity
 * row in the same transaction; and a push goes only after the transaction has returned.
 */
class ExpenseLedger
{
    public function __construct(
        private readonly MailboxPush $push,
    ) {}

    /**
     * @template T
     *
     * @param  Closure(ExpenseGroup): T  $write
     * @return T
     */
    public function locked(int $groupId, Closure $write, bool $evenIfArchived = false): mixed
    {
        return DB::transaction(function () use ($groupId, $write, $evenIfArchived) {
            $group = ExpenseGroup::query()->whereKey($groupId)->lockForUpdate()->firstOrFail();

            if ($group->archived_at !== null && ! $evenIfArchived) {
                self::refuse('group', 'This group is archived. Unarchive it to make changes.');
            }

            return $write($group);
        });
    }

    /** @param  array{title: string, amount: int, spent_on: string, paid_by_id: int, split_mode: string, category: string|null, participant_ids: list<int>, shares: array<int, int>}  $input */
    public function create(ExpenseGroup $group, User $actor, array $input): Expense
    {
        [$expense, $shares] = $this->locked($group->id, function (ExpenseGroup $group) use ($actor, $input): array {
            // Again under the lock: the gate ran before it, and they may have been removed since.
            abort_unless($group->hasMember($actor), 403);
            self::assertMembers($group, $input);

            $expense = new Expense(self::fields($input));
            $expense->group_id = $group->id;
            $expense->created_by_id = $actor->id;
            $expense->save();

            $shares = self::split($input, $expense->id);
            $expense->writeShares($shares);

            ExpenseActivity::log($group->id, $actor, 'expense.created', $expense->id, self::snapshot($expense, $shares));

            return [$expense, $shares];
        });

        $this->tell([$expense->paid_by_id, ...array_keys($shares)], $actor, $expense, "{$actor->firstName()} added a shared expense");

        return $expense;
    }

    /** @param  array{title: string, amount: int, spent_on: string, paid_by_id: int, split_mode: string, category: string|null, participant_ids: list<int>, shares: array<int, int>}  $input */
    public function update(Expense $expense, User $actor, array $input): void
    {
        $this->locked($expense->group_id, function (ExpenseGroup $group) use ($expense, $actor, $input): void {
            // Again under the lock: the gate ran before it, and they may have been removed since.
            abort_unless($group->hasMember($actor), 403);
            $expense = Expense::query()->whereKey($expense->id)->lockForUpdate()->firstOrFail();

            if ($expense->is_settlement) {
                self::refuse('expense', 'A payment can\'t be edited. Delete it and record it again.');
            }

            self::assertMembers($group, $input, $expense);

            $before = self::snapshot($expense, $expense->shareMap());
            $shares = self::split($input, $expense->id);
            $expense->fill(self::fields($input));
            $after = self::snapshot($expense, $shares);

            if ($after === $before) {
                return;
            }

            $expense->updated_by_id = $actor->id;
            $expense->save();
            $expense->writeShares($shares);

            $changed = array_keys(array_filter($after, fn (mixed $value, string $key): bool => $value !== $before[$key], ARRAY_FILTER_USE_BOTH));

            ExpenseActivity::log($group->id, $actor, 'expense.updated', $expense->id, [
                'title' => $expense->title,
                'before' => array_intersect_key($before, array_flip($changed)),
                'after' => array_intersect_key($after, array_flip($changed)),
            ]);
        });
    }

    public function delete(Expense $expense, User $actor): void
    {
        $this->locked($expense->group_id, function (ExpenseGroup $group) use ($expense, $actor): void {
            // Again under the lock: the gate ran before it, and they may have been removed since.
            abort_unless($group->hasMember($actor), 403);
            $expense = Expense::query()->whereKey($expense->id)->lockForUpdate()->firstOrFail();

            // SoftDeletes writes only its own column, so who deleted it is saved first.
            $expense->deleted_by_id = $actor->id;
            $expense->save();
            $expense->delete();

            ExpenseActivity::log($group->id, $actor, 'expense.deleted', $expense->id, self::snapshot($expense, $expense->shareMap()));
        });
    }

    public function restore(Expense $expense, User $actor): void
    {
        $this->locked($expense->group_id, function (ExpenseGroup $group) use ($expense, $actor): void {
            // Again under the lock: the gate ran before it, and they may have been removed since.
            abort_unless($group->hasMember($actor), 403);
            $expense = Expense::onlyTrashed()->whereKey($expense->id)->lockForUpdate()->first()
                ?? self::refuse('expense', 'This expense has already been restored.');

            $shares = $expense->shareMap();

            // Someone on it may have left the group while it was deleted.
            if (array_diff([$expense->paid_by_id, ...array_keys($shares)], $group->memberIds()) !== []) {
                self::refuse('expense', 'Someone on this expense is no longer in the group.');
            }

            $expense->deleted_by_id = null;
            $expense->restore();

            ExpenseActivity::log($group->id, $actor, 'expense.restored', $expense->id, self::snapshot($expense, $shares));
        });
    }

    /** A repayment recorded inside one group. */
    public function settle(ExpenseGroup $group, User $actor, int $fromId, int $toId, int $amount): Expense
    {
        $payment = $this->locked($group->id, function (ExpenseGroup $group) use ($actor, $fromId, $toId, $amount): Expense {
            // Again under the lock: the gate ran before it, and they may have been removed since.
            abort_unless($group->hasMember($actor), 403);
            $members = $group->memberIds();

            foreach (['from_id' => $fromId, 'to_id' => $toId] as $field => $userId) {
                if (! in_array($userId, $members, true)) {
                    self::refuse($field, 'Choose someone in this group.');
                }
            }

            return self::writePayment($group->id, $actor, $fromId, $toId, $amount);
        });

        $this->tell([$fromId, $toId], $actor, $payment, "{$actor->firstName()} recorded a payment");

        return $payment;
    }

    /**
     * Settles everything between two people: one repayment in each group where the simplified
     * payments have one of them paying the other, whichever way it runs. $expectedNet is what the
     * page showed (positive: $other owes $viewer); if the balances moved since, nothing is written.
     *
     * @return list<Expense>
     */
    public function settleWith(User $viewer, User $other, int $expectedNet): array
    {
        $payments = DB::transaction(function () use ($viewer, $other, $expectedNet): array {
            // In id order, so two people settling with each other at once can't deadlock.
            $groupIds = ExpenseGroup::query()->visibleTo($viewer)->whereNull('archived_at')
                ->orderBy('id')->lockForUpdate()->pluck('id')->all();

            $between = array_values(array_filter(
                ExpenseBalances::paymentsOf($viewer, $groupIds),
                fn (array $payment): bool => $other->isNot($viewer) && in_array($other->id, [$payment['from'], $payment['to']], true),
            ));

            if ((ExpenseBalances::overview($viewer, $between)[$other->id] ?? 0) !== $expectedNet) {
                self::refuse('expected_net', 'The balances changed. Check the new amount and try again.');
            }

            if ($between === []) {
                self::refuse('expected_net', 'There is nothing to settle.');
            }

            return array_map(
                fn (array $payment): Expense => self::writePayment($payment['group_id'], $viewer, $payment['from'], $payment['to'], $payment['amount']),
                $between,
            );
        });

        $this->tell([$other->id], $viewer, $payments[0], "{$viewer->firstName()} recorded a payment");

        return $payments;
    }

    public static function refuse(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }

    private static function writePayment(int $groupId, User $actor, int $fromId, int $toId, int $amount): Expense
    {
        $payment = new Expense([
            'title' => 'Payment',
            'amount' => $amount,
            'spent_on' => Region::today()->toDateString(),
            'split_mode' => Expense::SPLIT_EXACT,
            'paid_by_id' => $fromId,
        ]);
        $payment->group_id = $groupId;
        $payment->created_by_id = $actor->id;
        $payment->is_settlement = true;
        $payment->save();
        $payment->writeShares([$toId => $amount]);

        ExpenseActivity::log($groupId, $actor, 'settlement.recorded', $payment->id, [
            'from_id' => $fromId,
            'to_id' => $toId,
            'amount' => $amount,
        ]);

        return $payment;
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    private static function fields(array $input): array
    {
        return array_intersect_key($input, array_flip(['title', 'amount', 'spent_on', 'split_mode', 'paid_by_id', 'category']));
    }

    /**
     * @param  array{amount: int, split_mode: string, category: string|null, participant_ids: list<int>, shares: array<int, int>}  $input
     * @return array<int, int>
     */
    private static function split(array $input, int $expenseId): array
    {
        if ($input['split_mode'] === Expense::SPLIT_EQUAL) {
            return ExpenseMath::equalShares($input['amount'], $input['participant_ids'], $expenseId);
        }

        $shares = $input['shares'];
        ksort($shares);

        return $shares;
    }

    /**
     * Checked under the lock: the members may have changed since the form was opened. A former
     * member can't be put on anything new, but an expense they were already on stays editable.
     *
     * @param  array{paid_by_id: int, split_mode: string, category: string|null, participant_ids: list<int>, shares: array<int, int>}  $input
     */
    private static function assertMembers(ExpenseGroup $group, array $input, ?Expense $existing = null): void
    {
        $members = $group->activeMemberIds();

        if ($existing !== null) {
            $members = array_values(array_intersect(
                $group->memberIds(),
                [...$members, $existing->paid_by_id, ...array_keys($existing->shareMap())],
            ));
        }

        if (! in_array($input['paid_by_id'], $members, true)) {
            self::refuse('paid_by_id', 'Whoever paid must be in this group.');
        }

        $equal = $input['split_mode'] === Expense::SPLIT_EQUAL;

        if (array_diff($equal ? $input['participant_ids'] : array_keys($input['shares']), $members) !== []) {
            self::refuse($equal ? 'participant_ids' : 'shares', 'Everyone sharing it must be in this group.');
        }
    }

    /**
     * @param  array<int, int>  $shares
     * @return array{title: string, amount: int, spent_on: string, paid_by_id: int, split_mode: string, category: string|null, shares: array<int, int>}
     */
    private static function snapshot(Expense $expense, array $shares): array
    {
        return [
            'title' => $expense->title,
            'amount' => $expense->amount,
            'spent_on' => $expense->spent_on->toDateString(),
            'paid_by_id' => $expense->paid_by_id,
            'split_mode' => $expense->split_mode,
            'category' => $expense->category?->value,
            'shares' => $shares,
        ];
    }

    /** @param  array<int, int>  $userIds */
    private function tell(array $userIds, User $actor, Expense $expense, string $body): void
    {
        $this->push->toExpense(
            User::query()->whereKey(array_diff(array_unique($userIds), [$actor->id]))->get(),
            $expense->group_id,
            $expense->id,
            $body,
        );
    }
}
