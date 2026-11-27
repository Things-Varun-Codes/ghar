<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseActivity;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\MiniApps\Mailbox\Support\ExpenseMath;
use App\Shell\Models\User;
use App\Shell\Support\Region;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SplitsExpenses;
use Tests\TestCase;

class ExpenseLifecycleTest extends TestCase
{
    use RefreshDatabase;
    use SplitsExpenses;

    private const BASE = '/apps/our-exchange/expenses';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedExpenseHousehold();
    }

    public function test_an_equal_split_stores_every_share_and_loses_nothing(): void
    {
        $response = $this->actingAs($this->ravi)->post(self::BASE."/groups/{$this->trip->id}/expenses", $this->dinner(['amount' => 10000]));

        $this->assertSuccessToast($response, 'Expense added.');
        $expense = Expense::query()->firstOrFail();
        $shares = $expense->shareMap();

        $this->assertSame(10000, array_sum($shares));
        $this->assertSame(1, max($shares) - min($shares));
        $this->assertSame(ExpenseMath::equalShares(10000, [$this->ravi->id, $this->meera->id, $this->kabir->id], $expense->id), $shares);
        $this->assertSame($this->ravi->id, $expense->created_by_id);
        $this->assertSame(0, array_sum($this->nets()));
        $this->assertSame(10000 - $shares[$this->ravi->id], $this->nets()[$this->ravi->id]);
    }

    public function test_an_exact_split_stores_what_was_typed_and_must_add_up(): void
    {
        $exact = fn (int $meera): array => $this->dinner([
            'split_mode' => 'exact',
            'participant_ids' => null,
            'shares' => [['user_id' => $this->meera->id, 'amount' => $meera], ['user_id' => $this->kabir->id, 'amount' => 2000]],
        ]);

        $this->actingAs($this->ravi)
            ->postJson(self::BASE."/groups/{$this->trip->id}/expenses", $exact(6000))
            ->assertStatus(422)
            ->assertJsonValidationErrors('shares');
        $this->assertDatabaseCount('mailbox_expenses', 0);

        $this->post(self::BASE."/groups/{$this->trip->id}/expenses", $exact(7000))->assertSessionHasNoErrors();

        $this->assertSame([$this->meera->id => 7000, $this->kabir->id => 2000], Expense::query()->firstOrFail()->shareMap());
        $this->assertSame([$this->ravi->id => 9000, $this->meera->id => -7000, $this->kabir->id => -2000], $this->nets());
    }

    public function test_an_edit_recomputes_the_shares_and_says_who_made_it(): void
    {
        $expense = $this->addDinner();

        $this->actingAs($this->meera)
            ->patch(self::BASE."/{$expense->id}", $this->dinner(['amount' => 5001, 'participant_ids' => [$this->ravi->id, $this->meera->id]]))
            ->assertSessionHasNoErrors();

        $expense->refresh();
        $this->assertSame($this->meera->id, $expense->updated_by_id);
        $this->assertSame(ExpenseMath::equalShares(5001, [$this->ravi->id, $this->meera->id], $expense->id), $expense->shareMap());
        $this->assertSame(5001, array_sum($expense->shareMap()));
        $this->assertArrayNotHasKey($this->kabir->id, $this->nets());

        $log = ExpenseActivity::query()->where('action', 'expense.updated')->sole();
        $this->assertSame(['amount', 'shares'], array_keys($log->data['before']));
        $this->assertSame(9000, $log->data['before']['amount']);
        $this->assertSame(5001, $log->data['after']['amount']);
        $this->assertCount(3, $log->data['before']['shares']);
        $this->assertCount(2, $log->data['after']['shares']);
    }

    public function test_deleting_takes_it_out_of_the_balances_and_restoring_puts_it_back(): void
    {
        $expense = $this->addDinner();
        $before = $this->nets();

        $this->actingAs($this->kabir)->delete(self::BASE."/{$expense->id}")->assertSessionHasNoErrors();

        $this->assertSame([], $this->nets());
        $this->assertSoftDeleted('mailbox_expenses', ['id' => $expense->id, 'deleted_by_id' => $this->kabir->id]);
        $this->get(self::BASE."/groups/{$this->trip->id}")->assertInertia(fn ($page) => $page->has('expenses.data', 0));
        $this->get(self::BASE."/groups/{$this->trip->id}?tab=activity")->assertInertia(fn ($page) => $page
            ->where('activity.0.action', 'expense.deleted')
            ->where('activity.0.can_restore', true)
            ->where('activity.0.expense_id', $expense->id));

        $this->patch(self::BASE."/{$expense->id}/restore")->assertSessionHasNoErrors();

        $this->assertSame($before, $this->nets());
        $this->assertDatabaseHas('mailbox_expenses', ['id' => $expense->id, 'deleted_at' => null, 'deleted_by_id' => null]);
        $this->patchJson(self::BASE."/{$expense->id}/restore")->assertStatus(422);
    }

    public function test_a_repayment_moves_both_nets(): void
    {
        $this->addDinner();

        $response = $this->actingAs($this->meera)->post(self::BASE."/groups/{$this->trip->id}/settlements", [
            'from_id' => $this->meera->id, 'to_id' => $this->ravi->id, 'amount' => 3000,
        ]);

        $this->assertSuccessToast($response, 'Payment recorded.');
        $this->assertSame([$this->ravi->id => 3000, $this->kabir->id => -3000], $this->nets());

        $payment = Expense::query()->where('is_settlement', true)->sole();
        $this->assertSame($this->meera->id, $payment->paid_by_id);
        $this->assertSame([$this->ravi->id => 3000], $payment->shareMap());

        $this->patchJson(self::BASE."/{$payment->id}", $this->dinner())->assertStatus(422)->assertJsonValidationErrors('expense');
    }

    public function test_a_repayment_needs_two_different_members_and_a_positive_amount(): void
    {
        $settle = fn (array $payload) => $this->actingAs($this->ravi)->postJson(self::BASE."/groups/{$this->trip->id}/settlements", $payload);

        $settle(['from_id' => $this->asha->id, 'to_id' => $this->ravi->id, 'amount' => 100])->assertJsonValidationErrors('from_id');
        $settle(['from_id' => $this->ravi->id, 'to_id' => $this->asha->id, 'amount' => 100])->assertJsonValidationErrors('to_id');
        $settle(['from_id' => $this->ravi->id, 'to_id' => $this->ravi->id, 'amount' => 100])->assertJsonValidationErrors('to_id');
        $settle(['from_id' => $this->meera->id, 'to_id' => $this->ravi->id, 'amount' => 0])->assertJsonValidationErrors('amount');

        $this->assertDatabaseCount('mailbox_expenses', 0);
    }

    public function test_a_group_is_archived_only_when_settled_and_is_then_read_only(): void
    {
        $expense = $this->addDinner();
        $group = self::BASE."/groups/{$this->trip->id}";

        $this->actingAs($this->ravi)->patchJson("{$group}/archive")->assertStatus(422)->assertJsonValidationErrors('group');
        $this->assertNull($this->trip->refresh()->archived_at);

        foreach ([$this->meera, $this->kabir] as $debtor) {
            $this->post("{$group}/settlements", ['from_id' => $debtor->id, 'to_id' => $this->ravi->id, 'amount' => 3000]);
        }

        $this->patch("{$group}/archive")->assertSessionHasNoErrors();
        $this->assertNotNull($this->trip->refresh()->archived_at);
        $this->get($group)->assertInertia(fn ($page) => $page->where('group.archived', true)->where('group.can.write', false));

        $written = Expense::withTrashed()->count();
        $this->postJson("{$group}/expenses", $this->dinner())->assertJsonValidationErrors('group');
        $this->patchJson(self::BASE."/{$expense->id}", $this->dinner(['title' => 'Supper']))->assertJsonValidationErrors('group');
        $this->deleteJson(self::BASE."/{$expense->id}")->assertJsonValidationErrors('group');
        $this->postJson("{$group}/settlements", ['from_id' => $this->meera->id, 'to_id' => $this->ravi->id, 'amount' => 1])->assertJsonValidationErrors('group');
        $this->patchJson($group, ['name' => 'Renamed'])->assertJsonValidationErrors('group');
        $this->assertSame($written, Expense::query()->count());
        $this->assertSame('Dinner', $expense->refresh()->title);

        $this->patch("{$group}/unarchive")->assertSessionHasNoErrors();
        $this->post("{$group}/expenses", $this->dinner())->assertSessionHasNoErrors();
    }

    public function test_someone_on_a_live_expense_cannot_be_removed(): void
    {
        $expense = $this->addDinner(['participant_ids' => [$this->ravi->id, $this->kabir->id]]);
        $group = self::BASE."/groups/{$this->trip->id}";
        $without = fn (int ...$gone): array => ['member_ids' => array_values(array_diff($this->trip->memberIds(), $gone))];

        $this->actingAs($this->ravi)->patchJson($group, $without($this->kabir->id))
            ->assertStatus(422)
            ->assertJsonPath('errors.member_ids.0', 'Kabir can\'t leave while on an expense in this group.');
        $this->patchJson($group, $without($this->ravi->id))->assertJsonValidationErrors('member_ids');

        // Meera is on nothing.
        $this->patch($group, $without($this->meera->id))->assertSessionHasNoErrors();
        $this->assertSame([$this->ravi->id, $this->kabir->id], $this->trip->memberIds());

        $this->delete(self::BASE."/{$expense->id}");
        $this->patch($group, ['member_ids' => [$this->ravi->id]])->assertSessionHasNoErrors();
        $this->assertSame([$this->ravi->id], $this->trip->memberIds());

        // Kabir left while it was deleted, so it can't come back with him on it.
        $this->patchJson(self::BASE."/{$expense->id}/restore")->assertJsonValidationErrors('expense');
    }

    public function test_someone_who_leaves_a_group_is_sent_back_to_the_list(): void
    {
        $this->actingAs($this->meera)
            ->patch(self::BASE."/groups/{$this->trip->id}", ['member_ids' => [$this->ravi->id, $this->kabir->id]])
            ->assertRedirect(self::BASE);

        $this->get(self::BASE."/groups/{$this->trip->id}")->assertForbidden();
    }

    public function test_a_bad_expense_is_refused_field_by_field(): void
    {
        $this->travelTo('2026-11-25 20:00:00');
        config(['shell.timezone' => 'Asia/Kolkata']);
        $store = fn (array $over) => $this->actingAs($this->ravi)->postJson(self::BASE."/groups/{$this->trip->id}/expenses", $this->dinner($over));

        // Already the 26th in Kolkata, so the 26th is today and the 27th is the future.
        $store(['spent_on' => '2026-11-27'])->assertJsonPath('errors.spent_on.0', 'The date can\'t be in the future.');
        $store(['paid_by_id' => $this->asha->id])->assertJsonValidationErrors('paid_by_id');
        $store(['participant_ids' => [$this->ravi->id, $this->asha->id]])->assertJsonValidationErrors('participant_ids');
        $store(['participant_ids' => [$this->ravi->id, $this->ravi->id]])->assertJsonValidationErrors('participant_ids.0');
        $store(['participant_ids' => []])->assertJsonValidationErrors('participant_ids');
        $store(['split_mode' => 'exact', 'shares' => [['user_id' => $this->asha->id, 'amount' => 9000]]])->assertJsonValidationErrors('shares');
        $store(['amount' => 0])->assertJsonValidationErrors('amount');
        $store(['amount' => '90.5'])->assertJsonValidationErrors('amount');
        $store(['amount' => Expense::MAX_AMOUNT + 1])->assertJsonValidationErrors('amount');
        $store(['split_mode' => 'percent'])->assertJsonValidationErrors('split_mode');
        $this->assertDatabaseCount('mailbox_expenses', 0);

        $store(['spent_on' => '2026-11-26', 'paid_by_id' => $this->kabir->id, 'participant_ids' => [$this->meera->id]])->assertRedirect();
        $this->assertEquals([$this->meera->id => -9000, $this->kabir->id => 9000], $this->nets());
    }

    public function test_general_is_fixed_and_everyone_is_in_it(): void
    {
        $general = ExpenseGroup::general();
        $url = self::BASE."/groups/{$general->id}";

        $this->addDinner(['participant_ids' => [$this->asha->id, $this->kabir->id]], $general);
        $this->assertSame(0, array_sum($this->nets($general)));

        $this->actingAs($this->kabir)->patch($url, ['name' => 'Ours'])->assertForbidden();
        $this->patch($url, ['member_ids' => [$this->kabir->id]])->assertForbidden();
        $this->patch("{$url}/archive")->assertForbidden();
        $this->patch("{$url}/unarchive")->assertForbidden();
        $this->delete($url)->assertForbidden();

        $this->assertSame('General', $general->refresh()->name);
        $this->assertDatabaseMissing('mailbox_expense_group_members', ['group_id' => $general->id]);
    }

    public function test_someone_new_joins_general_but_no_other_group(): void
    {
        $leela = User::factory()->create(['name' => 'Leela Rao']);

        $this->assertContains($leela->id, ExpenseGroup::general()->memberIds());
        $this->assertSame([$this->ravi->id, $this->meera->id, $this->kabir->id], $this->trip->refresh()->memberIds());

        $this->actingAs($leela)->get(self::BASE.'/groups/'.ExpenseGroup::general()->id)->assertOk();
        $this->get(self::BASE."/groups/{$this->trip->id}")->assertForbidden();
    }

    public function test_a_group_starts_with_its_maker_and_goes_only_if_it_never_had_an_expense(): void
    {
        $response = $this->actingAs($this->meera)->post(self::BASE.'/groups', ['name' => 'Gifts', 'member_ids' => [$this->kabir->id]]);

        $gifts = ExpenseGroup::query()->where('name', 'Gifts')->sole();
        $response->assertRedirect(self::BASE."/groups/{$gifts->id}");
        $this->assertSame([$this->meera->id, $this->kabir->id], $gifts->memberIds());
        $this->assertSame($this->meera->id, $gifts->created_by_id);

        $this->postJson(self::BASE.'/groups', ['name' => 'Ghosts', 'member_ids' => [0]])->assertJsonValidationErrors('member_ids.0');

        $expense = $this->addDinner();
        $this->actingAs($this->ravi)->delete(self::BASE."/{$expense->id}");
        $this->deleteJson(self::BASE."/groups/{$this->trip->id}")->assertJsonValidationErrors('group');
        $this->assertModelExists($this->trip);

        $this->actingAs($this->kabir)->delete(self::BASE."/groups/{$gifts->id}")->assertRedirect(self::BASE);
        $this->assertModelMissing($gifts);
    }

    public function test_the_list_is_newest_spent_first_searchable_and_loads_more(): void
    {
        $today = Region::today();

        foreach (range(1, 51) as $n) {
            Expense::factory()->sharedBy($this->ravi, $this->meera)->create([
                'group_id' => $this->trip->id,
                'paid_by_id' => $this->ravi->id,
                'title' => $n === 51 ? 'Ferry tickets' : "Meal {$n}",
                'spent_on' => $today->subDays($n)->toDateString(),
            ]);
        }

        $cursor = null;
        $this->actingAs($this->meera)->get(self::BASE."/groups/{$this->trip->id}?focus=7")->assertInertia(function ($page) use (&$cursor) {
            $page->component('MiniApps/Mailbox/Pages/Expenses/Group')
                ->has('expenses.data', 50)
                ->where('expenses.data.0.title', 'Meal 1')
                ->where('expenses.data.0.shares.0', ['user_id' => $this->ravi->id, 'amount' => 5000])
                ->where('focus', 7)
                ->where('tab', 'expenses')
                ->where('activity', null);
            $cursor = $page->toArray()['props']['expenses']['next_cursor'];
        });

        $this->get(self::BASE."/groups/{$this->trip->id}?cursor={$cursor}")
            ->assertInertia(fn ($page) => $page->has('expenses.data', 1)->where('expenses.data.0.title', 'Ferry tickets'));
        $this->get(self::BASE."/groups/{$this->trip->id}?q=ferry")
            ->assertInertia(fn ($page) => $page->has('expenses.data', 1)->where('q', 'ferry'));
    }

    public function test_the_group_page_gives_nets_and_who_should_pay_whom(): void
    {
        $this->addDinner();

        $this->actingAs($this->kabir)->get(self::BASE."/groups/{$this->trip->id}")->assertInertia(fn ($page) => $page
            ->where('group.name', 'Trip')
            ->where('group.member_ids', [$this->ravi->id, $this->meera->id, $this->kabir->id])
            ->where('group.can', ['write' => true, 'manage' => true, 'archive' => false, 'delete' => false])
            ->where('members', fn ($members) => collect($members)->pluck('name')->all() === ['Kabir', 'Meera', 'Ravi'])
            ->has('household', 4)
            ->where('nets', [
                ['user_id' => $this->ravi->id, 'net' => 6000],
                ['user_id' => $this->meera->id, 'net' => -3000],
                ['user_id' => $this->kabir->id, 'net' => -3000],
            ])
            ->where('suggestions', [
                ['from_id' => $this->meera->id, 'to_id' => $this->ravi->id, 'amount' => 3000],
                ['from_id' => $this->kabir->id, 'to_id' => $this->ravi->id, 'amount' => 3000],
            ]));
    }
}
