<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Actions\ExpenseLedger;
use App\MiniApps\Mailbox\Http\Resources\ExpenseResource;
use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseActivity;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\MiniApps\Mailbox\Support\ExpenseBalances;
use App\MiniApps\Mailbox\Support\ExpenseMath;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\FlashToast;
use App\Shell\Support\ListPage;
use App\Shell\Support\Person;
use App\Shell\Support\Region;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ExpensesController
{
    private const ACTIVITY_LIMIT = 100;

    public function index(Request $request, Household $household): Response
    {
        $viewer = $request->user();

        $groups = ExpenseGroup::query()
            ->visibleTo($viewer)
            ->with('memberRows')
            ->orderByDesc('is_general')
            ->orderByRaw('archived_at is not null')
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        $nets = ExpenseBalances::nets($groups->modelKeys());
        $overview = ExpenseBalances::overview($viewer);
        $everyone = $household->members();

        return Inertia::render('MiniApps/Mailbox/Pages/Expenses/Index', [
            'groups' => $groups->map(fn (ExpenseGroup $group): array => [
                ...self::group($group),
                'net' => $nets[$group->id][$viewer->id] ?? 0,
            ])->all(),
            'overview' => $everyone
                ->filter(fn (User $member): bool => isset($overview[$member->id]))
                ->map(fn (User $member): array => ['person' => Person::short($member), 'net' => $overview[$member->id]])
                ->values()
                ->all(),
            'members' => $everyone->map(fn (User $member): array => Person::short($member))->all(),
        ]);
    }

    public function show(Request $request, ExpenseGroup $group, Household $household): Response
    {
        Gate::authorize('view', $group);

        $tab = $request->query('tab') === 'activity' ? 'activity' : 'expenses';
        $focus = $request->query('focus');
        $memberIds = $group->memberIds();
        $nets = ExpenseBalances::netsIn($group);
        $everyone = $household->members();
        $manage = ! $group->is_general;

        return Inertia::render('MiniApps/Mailbox/Pages/Expenses/Group', [
            ...ListPage::make($request, Expense::query()->where('group_id', $group->id)->with('shares'), ListPage::chronological('spent_on'))
                ->searchable(['title'])
                ->props('expenses', 50, fn (Expense $expense): array => app(ExpenseResource::class)($expense)),
            'group' => [
                ...self::group($group),
                'can' => [
                    'write' => $group->archived_at === null,
                    'manage' => $manage,
                    'archive' => $manage && $group->archived_at === null && array_filter($nets) === [],
                    'delete' => $manage && ! $group->expenses()->withTrashed()->exists(),
                ],
            ],
            'members' => $everyone->whereIn('id', $memberIds)->map(fn (User $member): array => Person::short($member))->values()->all(),
            'household' => $everyone->map(fn (User $member): array => Person::short($member))->all(),
            'nets' => array_map(
                fn (int $userId): array => ['user_id' => $userId, 'net' => $nets[$userId] ?? 0],
                array_values(array_unique([...$memberIds, ...array_keys($nets)])),
            ),
            'suggestions' => array_map(
                fn (array $payment): array => ['from_id' => $payment['from'], 'to_id' => $payment['to'], 'amount' => $payment['amount']],
                ExpenseMath::simplify($nets),
            ),
            'tab' => $tab,
            'activity' => $tab === 'activity' ? self::activity($group) : null,
            'focus' => is_string($focus) && ctype_digit($focus) ? (int) $focus : null,
        ]);
    }

    public function store(Request $request, ExpenseGroup $group, ExpenseLedger $ledger): RedirectResponse
    {
        Gate::authorize('view', $group);

        $ledger->create($group, $request->user(), self::input($request));

        FlashToast::success('Expense added.');

        return redirect()->back();
    }

    public function update(Request $request, Expense $expense, ExpenseLedger $ledger): RedirectResponse
    {
        Gate::authorize('update', $expense);

        $ledger->update($expense, $request->user(), self::input($request));

        FlashToast::success('Expense updated.');

        return redirect()->back();
    }

    public function destroy(Request $request, Expense $expense, ExpenseLedger $ledger): RedirectResponse
    {
        Gate::authorize('update', $expense);

        $ledger->delete($expense, $request->user());

        FlashToast::success($expense->is_settlement ? 'Payment deleted.' : 'Expense deleted.');

        return redirect()->back();
    }

    public function restore(Request $request, Expense $expense, ExpenseLedger $ledger): RedirectResponse
    {
        Gate::authorize('update', $expense);

        $ledger->restore($expense, $request->user());

        FlashToast::success($expense->is_settlement ? 'Payment restored.' : 'Expense restored.');

        return redirect()->back();
    }

    public function settle(Request $request, ExpenseGroup $group, ExpenseLedger $ledger): RedirectResponse
    {
        Gate::authorize('view', $group);

        $data = $request->validate([
            'from_id' => ['required', 'integer'],
            'to_id' => ['required', 'integer', 'different:from_id'],
            'amount' => ['required', 'integer', 'min:1', 'max:'.Expense::MAX_AMOUNT],
        ]);

        $ledger->settle($group, $request->user(), (int) $data['from_id'], (int) $data['to_id'], (int) $data['amount']);

        FlashToast::success('Payment recorded.');

        return redirect()->back();
    }

    public function settleWith(Request $request, User $user, ExpenseLedger $ledger): RedirectResponse
    {
        $data = $request->validate(['expected_net' => ['required', 'integer']]);

        $ledger->settleWith($request->user(), $user, (int) $data['expected_net']);

        FlashToast::success('Settled up.');

        return redirect()->back();
    }

    /** @return array{id: int, name: string, is_general: bool, archived: bool, member_ids: list<int>} */
    private static function group(ExpenseGroup $group): array
    {
        return [
            'id' => $group->id,
            'name' => $group->name,
            'is_general' => $group->is_general,
            'archived' => $group->archived_at !== null,
            'member_ids' => $group->memberIds(),
        ];
    }

    /**
     * shortcut: the newest ACTIVITY_LIMIT rows with no paging; give it a cursor when a group
     * outgrows that.
     *
     * @return list<array<string, mixed>>
     */
    private static function activity(ExpenseGroup $group): array
    {
        // Only the latest deletion of an expense that is still deleted offers to restore it.
        $restorable = $group->archived_at !== null ? [] : ExpenseActivity::query()
            ->where('group_id', $group->id)
            ->where('action', 'expense.deleted')
            ->whereIn('expense_id', Expense::onlyTrashed()->where('group_id', $group->id)->select('id'))
            ->groupBy('expense_id')
            ->selectRaw('max(id) as id')
            ->toBase()
            ->pluck('id')
            ->all();

        return ExpenseActivity::query()
            ->where('group_id', $group->id)
            ->with('actor')
            ->latest('id')
            ->limit(self::ACTIVITY_LIMIT)
            ->get()
            ->map(fn (ExpenseActivity $row): array => [
                'id' => $row->id,
                'action' => $row->action,
                'actor' => Person::short($row->actor),
                'expense_id' => $row->expense_id,
                'data' => $row->data,
                'at' => $row->created_at->toIso8601String(),
                'can_restore' => in_array($row->id, $restorable, true),
            ])
            ->all();
    }

    /** @return array{title: string, amount: int, spent_on: string, paid_by_id: int, split_mode: string, participant_ids: list<int>, shares: array<int, int>} */
    private static function input(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'integer', 'min:1', 'max:'.Expense::MAX_AMOUNT],
            'spent_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.Region::today()->toDateString()],
            'paid_by_id' => ['required', 'integer'],
            'split_mode' => ['required', Rule::in([Expense::SPLIT_EQUAL, Expense::SPLIT_EXACT])],
            'participant_ids' => ['required_if:split_mode,'.Expense::SPLIT_EQUAL, 'nullable', 'array', 'min:1'],
            'participant_ids.*' => ['integer', 'distinct'],
            'shares' => ['required_if:split_mode,'.Expense::SPLIT_EXACT, 'nullable', 'array', 'min:1'],
            'shares.*.user_id' => ['required', 'integer', 'distinct'],
            'shares.*.amount' => ['required', 'integer', 'min:1', 'max:'.Expense::MAX_AMOUNT],
        ], [
            'spent_on.before_or_equal' => 'The date can\'t be in the future.',
            'participant_ids.required_if' => 'Choose who shares it.',
            'shares.required_if' => 'Enter what each person owes.',
        ]);

        $exact = $data['split_mode'] === Expense::SPLIT_EXACT;
        $shares = $exact ? array_map(intval(...), array_column($data['shares'], 'amount', 'user_id')) : [];

        if ($exact && array_sum($shares) !== (int) $data['amount']) {
            ExpenseLedger::refuse('shares', 'The amounts must add up to the total.');
        }

        return [
            'title' => $data['title'],
            'amount' => (int) $data['amount'],
            'spent_on' => $data['spent_on'],
            'paid_by_id' => (int) $data['paid_by_id'],
            'split_mode' => $data['split_mode'],
            'participant_ids' => $exact ? [] : array_values(array_map(intval(...), $data['participant_ids'])),
            'shares' => $shares,
        ];
    }
}
