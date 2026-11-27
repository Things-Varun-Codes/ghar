<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\ExpenseLedger;
use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseActivity;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\MiniApps\Mailbox\Support\ExpenseBalances;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ExpenseGroupsController
{
    public function store(Request $request, Household $household): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:60'], ...self::memberRules('required', $household)]);
        $viewer = $request->user();

        $group = DB::transaction(function () use ($data, $viewer): ExpenseGroup {
            $memberIds = self::ids([...$data['member_ids'], $viewer->id]);

            $group = new ExpenseGroup(['name' => $data['name']]);
            $group->created_by_id = $viewer->id;
            $group->save();
            $group->memberRows()->attach($memberIds);

            ExpenseActivity::log($group->id, $viewer, 'group.created', data: ['name' => $group->name, 'member_ids' => $memberIds]);

            return $group;
        });

        FlashToast::success('Group created.');

        return redirect()->route('apps.our-exchange.expenses.groups.show', $group);
    }

    /** A rename, a change of members, or both; each is its own line in the activity. */
    public function update(Request $request, ExpenseGroup $group, ExpenseLedger $ledger, Household $household): RedirectResponse
    {
        Gate::authorize('manage', $group);

        $data = $request->validate(['name' => ['sometimes', 'required', 'string', 'max:60'], ...self::memberRules('sometimes', $household, $group)]);
        $viewer = $request->user();

        $stillIn = $ledger->locked($group->id, function (ExpenseGroup $group) use ($data, $viewer, $household): bool {
            if (isset($data['name']) && $data['name'] !== $group->name) {
                $before = $group->name;
                $group->update(['name' => $data['name']]);

                ExpenseActivity::log($group->id, $viewer, 'group.renamed', data: ['before' => $before, 'after' => $group->name]);
            }

            $current = $group->memberIds();
            $wanted = self::ids($data['member_ids'] ?? $current);
            $removed = array_values(array_diff($current, $wanted));
            $added = array_values(array_diff($wanted, $current));

            if ($removed !== []) {
                $onAnExpense = User::query()->whereKey($removed)->where(function ($query) use ($group): void {
                    $live = Expense::query()->where('group_id', $group->id);

                    $query->whereIn('id', $live->clone()->select('paid_by_id'))
                        ->orWhereIn('id', DB::table('mailbox_expense_shares')->whereIn('expense_id', $live->clone()->select('id'))->select('user_id'));
                })->orderBy('name')->get();

                if ($onAnExpense->isNotEmpty()) {
                    $names = $onAnExpense->map(fn (User $user): string => $household->shortName($user))->join(', ', ' and ');

                    ExpenseLedger::refuse('member_ids', "{$names} can't leave while on an expense in this group.");
                }
            }

            if ($removed !== [] || $added !== []) {
                $group->memberRows()->sync($wanted);

                ExpenseActivity::log($group->id, $viewer, 'group.members_changed', data: ['added' => $added, 'removed' => $removed]);
            }

            return in_array($viewer->id, $wanted, true);
        });

        FlashToast::success('Group updated.');

        // Someone who took themselves out can no longer open the page they were on.
        return $stillIn ? redirect()->back() : redirect()->route('apps.our-exchange.expenses.index');
    }

    public function archive(Request $request, ExpenseGroup $group, ExpenseLedger $ledger): RedirectResponse
    {
        Gate::authorize('manage', $group);

        $ledger->locked($group->id, function (ExpenseGroup $group) use ($request): void {
            if (array_filter(ExpenseBalances::netsIn($group)) !== []) {
                ExpenseLedger::refuse('group', 'Settle every balance before archiving this group.');
            }

            $group->archived_at = now();
            $group->save();

            ExpenseActivity::log($group->id, $request->user(), 'group.archived');
        });

        FlashToast::success('Group archived.');

        return redirect()->back();
    }

    public function unarchive(Request $request, ExpenseGroup $group, ExpenseLedger $ledger): RedirectResponse
    {
        Gate::authorize('manage', $group);

        $ledger->locked($group->id, function (ExpenseGroup $group) use ($request): void {
            if ($group->archived_at === null) {
                return;
            }

            $group->archived_at = null;
            $group->save();

            ExpenseActivity::log($group->id, $request->user(), 'group.unarchived');
        }, evenIfArchived: true);

        FlashToast::success('Group unarchived.');

        return redirect()->back();
    }

    public function destroy(ExpenseGroup $group, ExpenseLedger $ledger): RedirectResponse
    {
        Gate::authorize('manage', $group);

        $ledger->locked($group->id, function (ExpenseGroup $group): void {
            // A deleted expense still counts: restoring it would need its group back.
            if ($group->expenses()->withTrashed()->exists()) {
                ExpenseLedger::refuse('group', 'A group that has had expenses can\'t be deleted. Archive it instead.');
            }

            $group->delete();
        }, evenIfArchived: true);

        FlashToast::success('Group deleted.');

        return redirect()->route('apps.our-exchange.expenses.index');
    }

    /**
     * Anyone in the household, plus whoever is already in the group: a former member stays in
     * it until they're taken out, but can't be put back.
     *
     * @return array<string, array<int, mixed>>
     */
    private static function memberRules(string $presence, Household $household, ?ExpenseGroup $group = null): array
    {
        return [
            'member_ids' => [$presence, 'array', 'min:1'],
            'member_ids.*' => ['integer', 'distinct', Rule::in([...$household->query()->pluck('id')->all(), ...($group?->memberIds() ?? [])])],
        ];
    }

    /**
     * @param  array<int, mixed>  $ids
     * @return list<int>
     */
    private static function ids(array $ids): array
    {
        $ids = array_values(array_unique(array_map(intval(...), $ids)));
        sort($ids);

        return $ids;
    }
}
