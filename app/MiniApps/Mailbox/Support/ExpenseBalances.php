<?php

namespace App\MiniApps\Mailbox\Support;

use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Who is up and who is down, summed from the live expenses every time: nothing here is stored.
 * Debts are simplified inside a group and never across groups.
 */
final class ExpenseBalances
{
    /**
     * @param  array<int, int>  $groupIds
     * @return array<int, array<int, int>> group id => user id => net (positive: is owed)
     */
    public static function nets(array $groupIds): array
    {
        $nets = array_fill_keys($groupIds, []);

        $paid = Expense::query()
            ->whereIn('group_id', $groupIds)
            ->groupBy('group_id', 'paid_by_id')
            ->selectRaw('group_id, paid_by_id as user_id, sum(amount)::bigint as total')
            ->toBase()
            ->get();

        $shared = DB::table('mailbox_expense_shares as s')
            ->join('mailbox_expenses as e', 'e.id', '=', 's.expense_id')
            ->whereNull('e.deleted_at')
            ->whereIn('e.group_id', $groupIds)
            ->groupBy('e.group_id', 's.user_id')
            ->selectRaw('e.group_id, s.user_id, -sum(s.amount)::bigint as total')
            ->get();

        foreach ([...$paid, ...$shared] as $row) {
            $nets[$row->group_id][$row->user_id] = ($nets[$row->group_id][$row->user_id] ?? 0) + (int) $row->total;
        }

        return $nets;
    }

    /** @return array<int, int> user id => net */
    public static function netsIn(ExpenseGroup $group): array
    {
        return self::nets([$group->id])[$group->id];
    }

    /**
     * The simplified payments that involve the viewer, in each of their groups that isn't
     * archived. The overview and settling up both read this, so they can't disagree.
     *
     * @param  array<int, int>|null  $groupIds  the viewer's open groups, when the caller already has them
     * @return list<array{group_id: int, from: int, to: int, amount: int}>
     */
    public static function paymentsOf(User $viewer, ?array $groupIds = null): array
    {
        $groupIds ??= ExpenseGroup::query()->visibleTo($viewer)->whereNull('archived_at')->pluck('id')->all();
        $payments = [];

        foreach (self::nets($groupIds) as $groupId => $nets) {
            foreach (ExpenseMath::simplify($nets) as $payment) {
                if ($payment['from'] === $viewer->id || $payment['to'] === $viewer->id) {
                    $payments[] = ['group_id' => $groupId, ...$payment];
                }
            }
        }

        return $payments;
    }

    /**
     * One figure per other person, across the viewer's groups.
     *
     * @param  list<array{group_id: int, from: int, to: int, amount: int}>|null  $payments
     * @return array<int, int> user id => net (positive: they owe the viewer; negative: the viewer owes them; 0: even overall, open in groups)
     */
    public static function overview(User $viewer, ?array $payments = null): array
    {
        $overview = [];

        foreach ($payments ?? self::paymentsOf($viewer) as $payment) {
            $other = $payment['from'] === $viewer->id ? $payment['to'] : $payment['from'];
            $overview[$other] = ($overview[$other] ?? 0) + ($payment['to'] === $viewer->id ? $payment['amount'] : -$payment['amount']);
        }

        // A pair that is even overall but not in each group stays in, at 0, so it can still be settled.
        return $overview;
    }
}
