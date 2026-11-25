<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseActivity;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\MiniApps\Mailbox\Support\ExpenseBalances;
use App\MiniApps\Mailbox\Support\ExpenseMath;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SplitsExpenses;
use Tests\TestCase;

class ExpenseSettleTest extends TestCase
{
    use RefreshDatabase;
    use SplitsExpenses;

    private const BASE = '/apps/our-exchange/expenses';

    private ExpenseGroup $flat;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedExpenseHousehold();

        // Trip: Meera and Kabir owe Ravi 3000 each. Flat (Ravi and Meera): Ravi owes Meera 1000.
        // General: Asha owes Meera 2500.
        $this->flat = ExpenseGroup::factory()->of($this->ravi, $this->meera)->create(['name' => 'Flat']);
        $this->addDinner();
        $this->addDinner(['title' => 'Bulbs', 'amount' => 2000, 'paid_by_id' => $this->meera->id, 'participant_ids' => [$this->ravi->id, $this->meera->id]], $this->flat);
        $this->addDinner(['title' => 'Milk', 'amount' => 5000, 'paid_by_id' => $this->meera->id, 'participant_ids' => [$this->asha->id, $this->meera->id]], ExpenseGroup::general());
        Notification::fake();
    }

    /** What $a is owed by $b (negative: owes) in one group's suggestions. */
    private function edge(ExpenseGroup $group, User $a, User $b): int
    {
        $total = 0;

        foreach (ExpenseMath::simplify(ExpenseBalances::netsIn($group)) as $payment) {
            $total += match ([$payment['from'], $payment['to']]) {
                [$b->id, $a->id] => $payment['amount'],
                [$a->id, $b->id] => -$payment['amount'],
                default => 0,
            };
        }

        return $total;
    }

    public function test_the_overview_is_the_group_suggestions_added_up_per_person(): void
    {
        ExpenseGroup::factory()->of($this->ravi, $this->meera)->archived()->create();
        $groups = [$this->trip, $this->flat, ExpenseGroup::general()];

        foreach ([$this->asha, $this->ravi, $this->meera, $this->kabir] as $viewer) {
            $expected = [];

            foreach ([$this->asha, $this->ravi, $this->meera, $this->kabir] as $other) {
                $sum = $other->is($viewer) ? 0 : array_sum(array_map(fn (ExpenseGroup $group): int => $this->edge($group, $viewer, $other), $groups));

                if ($sum !== 0) {
                    $expected[$other->id] = $sum;
                }
            }

            $this->assertEquals($expected, ExpenseBalances::overview($viewer));
        }

        $this->assertEquals([$this->ravi->id => -2000, $this->asha->id => 2500], ExpenseBalances::overview($this->meera));
    }

    public function test_an_archived_group_is_left_out_of_the_overview(): void
    {
        $this->flat->archived_at = now();
        $this->flat->save();

        $this->assertSame(-3000, ExpenseBalances::overview($this->meera)[$this->ravi->id]);
    }

    public function test_settling_from_the_overview_clears_the_pair_in_every_group_and_logs_each_repayment(): void
    {
        $activity = ExpenseActivity::query()->count();

        $response = $this->actingAs($this->meera)->post(self::BASE."/settle/{$this->ravi->id}", ['expected_net' => -2000]);

        $this->assertSuccessToast($response, 'Settled up.');
        $this->assertArrayNotHasKey($this->ravi->id, ExpenseBalances::overview($this->meera));
        $this->assertArrayNotHasKey($this->meera->id, ExpenseBalances::overview($this->ravi));
        $this->assertSame(0, $this->edge($this->trip, $this->meera, $this->ravi));
        $this->assertSame(0, $this->edge($this->flat, $this->meera, $this->ravi));
        // Kabir's debt to Ravi and Asha's to Meera are nobody else's to settle.
        $this->assertSame(3000, $this->edge($this->trip, $this->ravi, $this->kabir));
        $this->assertSame(2500, ExpenseBalances::overview($this->meera)[$this->asha->id]);

        $payments = Expense::query()->where('is_settlement', true)->orderBy('group_id')->get();
        $this->assertSame(
            [[$this->trip->id, $this->meera->id, 3000], [$this->flat->id, $this->ravi->id, 1000]],
            $payments->map(fn (Expense $p): array => [$p->group_id, $p->paid_by_id, $p->amount])->all(),
        );

        $logged = ExpenseActivity::query()->where('action', 'settlement.recorded')->orderBy('group_id')->get();
        $this->assertSame($activity + 2, ExpenseActivity::query()->count());
        $this->assertSame([$this->meera->id, $this->meera->id], $logged->pluck('actor_id')->all());
        $this->assertSame($payments->modelKeys(), $logged->pluck('expense_id')->all());
        $this->assertEquals(['from_id' => $this->ravi->id, 'to_id' => $this->meera->id, 'amount' => 1000], $logged[1]->data);
    }

    public function test_a_pair_that_is_even_overall_but_not_in_each_group_can_still_settle(): void
    {
        $this->actingAs($this->meera)->post(self::BASE."/groups/{$this->trip->id}/settlements", [
            'from_id' => $this->meera->id, 'to_id' => $this->ravi->id, 'amount' => 2000,
        ]);

        $this->assertSame(0, ExpenseBalances::overview($this->meera)[$this->ravi->id]);
        $this->assertSame(-1000, $this->edge($this->trip, $this->meera, $this->ravi));

        $this->actingAs($this->meera)->post(self::BASE."/settle/{$this->ravi->id}", ['expected_net' => 0]);

        $this->assertArrayNotHasKey($this->ravi->id, ExpenseBalances::overview($this->meera));
        $this->assertSame(0, $this->edge($this->trip, $this->meera, $this->ravi));
        $this->assertSame(0, $this->edge($this->flat, $this->meera, $this->ravi));
    }

    public function test_a_stale_figure_writes_nothing_and_a_second_submit_cannot_push_again(): void
    {
        $written = [Expense::query()->count(), ExpenseActivity::query()->count()];
        $settle = fn (int $net) => $this->actingAs($this->meera)->postJson(self::BASE."/settle/{$this->ravi->id}", ['expected_net' => $net]);

        $settle(-3000)->assertStatus(422)->assertJsonPath('errors.expected_net.0', 'The balances changed. Check the new amount and try again.');
        $settle(2000)->assertStatus(422);
        $this->postJson(self::BASE."/settle/{$this->meera->id}", ['expected_net' => 0])->assertStatus(422);
        $this->postJson(self::BASE."/settle/{$this->kabir->id}", ['expected_net' => 0])->assertJsonPath('errors.expected_net.0', 'There is nothing to settle.');
        $this->assertSame($written, [Expense::query()->count(), ExpenseActivity::query()->count()]);
        Notification::assertNothingSent();

        $settle(-2000)->assertRedirect();
        $settle(-2000)->assertStatus(422);

        $this->assertSame($written[0] + 2, Expense::query()->count());
        Notification::assertSentToTimes($this->ravi, GenericPushNotification::class, 1);
        Notification::assertCount(1);
    }

    public function test_a_new_expense_tells_only_the_others_on_it_and_says_nothing_of_it(): void
    {
        $this->actingAs($this->ravi)->post(self::BASE."/groups/{$this->trip->id}/expenses", $this->dinner([
            'title' => 'Lobster thermidor',
            'amount' => 123456,
            'paid_by_id' => $this->meera->id,
            'participant_ids' => [$this->ravi->id],
        ]));
        $expense = Expense::query()->latest('id')->firstOrFail();

        Notification::assertSentTo($this->meera, GenericPushNotification::class, function (GenericPushNotification $push) use ($expense): bool {
            $message = $push->toWebPush($this->meera, $push)->toArray();
            $text = (string) json_encode($message);

            return $message['body'] === 'Ravi added a shared expense'
                && $message['tag'] === 'our-exchange:expenses'
                && $message['data']['url'] === "/apps/our-exchange/expenses/groups/{$this->trip->id}?focus={$expense->id}"
                && ! str_contains($text, 'Lobster')
                && ! str_contains($text, 'Trip')
                && ! preg_match('/123456|1234\.56|1,234/', $text);
        });
        // Ravi did it; Kabir is in the group but not on the expense.
        Notification::assertCount(1);
    }

    public function test_edits_deletes_restores_and_group_changes_send_nothing(): void
    {
        $expense = Expense::query()->where('group_id', $this->trip->id)->sole();
        $group = self::BASE."/groups/{$this->trip->id}";

        $this->actingAs($this->ravi)->patch(self::BASE."/{$expense->id}", $this->dinner(['amount' => 6000]))->assertSessionHasNoErrors();
        $this->delete(self::BASE."/{$expense->id}")->assertSessionHasNoErrors();
        $this->patch(self::BASE."/{$expense->id}/restore")->assertSessionHasNoErrors();
        $this->patch($group, ['name' => 'Road trip'])->assertSessionHasNoErrors();
        $this->delete(self::BASE."/{$expense->id}");
        $this->patch("{$group}/archive")->assertSessionHasNoErrors();
        $this->patch("{$group}/unarchive")->assertSessionHasNoErrors();
        $this->post(self::BASE.'/groups', ['name' => 'Gifts', 'member_ids' => [$this->kabir->id]])->assertSessionHasNoErrors();

        Notification::assertNothingSent();
    }

    public function test_a_repayment_tells_the_other_party_only(): void
    {
        $settle = fn (User $actor) => $this->actingAs($actor)->post(self::BASE."/groups/{$this->trip->id}/settlements", [
            'from_id' => $this->kabir->id, 'to_id' => $this->ravi->id, 'amount' => 777,
        ]);

        $settle($this->kabir);
        Notification::assertSentTo($this->ravi, GenericPushNotification::class, function (GenericPushNotification $push): bool {
            $message = $push->toWebPush($this->ravi, $push)->toArray();

            return $message['body'] === 'Kabir recorded a payment' && ! str_contains((string) json_encode($message), '777');
        });
        Notification::assertCount(1);

        // Meera writes down a payment between the other two: both hear of it, she doesn't.
        $settle($this->meera);
        Notification::assertSentToTimes($this->ravi, GenericPushNotification::class, 2);
        Notification::assertSentToTimes($this->kabir, GenericPushNotification::class, 1);
        Notification::assertNotSentTo($this->meera, GenericPushNotification::class);
    }

    public function test_each_change_writes_one_line_of_activity_by_whoever_made_it(): void
    {
        $expense = Expense::query()->where('group_id', $this->trip->id)->sole();
        $group = self::BASE."/groups/{$this->trip->id}";
        $settled = ['from_id' => $this->meera->id, 'to_id' => $this->ravi->id, 'amount' => 3000];

        // [who, method, url, payload, action]
        $steps = [
            [$this->meera, 'patch', self::BASE."/{$expense->id}", $this->dinner(['title' => 'Supper']), 'expense.updated'],
            [$this->kabir, 'delete', self::BASE."/{$expense->id}", [], 'expense.deleted'],
            [$this->ravi, 'patch', self::BASE."/{$expense->id}/restore", [], 'expense.restored'],
            [$this->meera, 'post', "{$group}/settlements", $settled, 'settlement.recorded'],
            [$this->kabir, 'post', "{$group}/settlements", [...$settled, 'from_id' => $this->kabir->id], 'settlement.recorded'],
            [$this->ravi, 'patch', $group, ['name' => 'Road trip'], 'group.renamed'],
            [$this->ravi, 'patch', $group, ['name' => 'Road trip', 'member_ids' => [$this->asha->id, $this->ravi->id, $this->meera->id, $this->kabir->id]], 'group.members_changed'],
            [$this->asha, 'patch', "{$group}/archive", [], 'group.archived'],
            [$this->kabir, 'patch', "{$group}/unarchive", [], 'group.unarchived'],
            [$this->meera, 'post', "{$group}/expenses", $this->dinner(), 'expense.created'],
            [$this->kabir, 'post', self::BASE.'/groups', ['name' => 'Gifts', 'member_ids' => [$this->ravi->id]], 'group.created'],
        ];

        foreach ($steps as [$actor, $method, $url, $payload, $action]) {
            $before = ExpenseActivity::query()->max('id');

            $this->actingAs($actor)->{$method}($url, $payload)->assertRedirect()->assertSessionHasNoErrors();

            $row = ExpenseActivity::query()->where('id', '>', $before)->sole();
            $this->assertSame([$action, $actor->id], [$row->action, $row->actor_id], $action);
        }

        $this->assertEquals(['added' => [$this->asha->id], 'removed' => []], ExpenseActivity::query()->where('action', 'group.members_changed')->sole()->data);
        $this->assertEquals(['before' => 'Trip', 'after' => 'Road trip'], ExpenseActivity::query()->where('action', 'group.renamed')->sole()->data);

        // Saving a form that changes nothing isn't a change.
        $count = ExpenseActivity::query()->count();
        $this->actingAs($this->ravi)->patch($group, ['name' => 'Road trip'])->assertSessionHasNoErrors();
        $this->assertSame($count, ExpenseActivity::query()->count());
    }

    public function test_home_says_who_you_owe_and_nothing_else(): void
    {
        $feed = fn (User $user): array => $this->actingAs($user)->get('/dashboard')->viewData('page')['props']['feed'];

        // Her debt to Ravi is in Trip and Flat; Milk, in General, is newer but isn't between them.
        Expense::query()->where('title', 'Dinner')->update(['created_at' => '2026-11-01 08:00:00']);
        Expense::query()->where('title', 'Bulbs')->update(['created_at' => '2026-11-03 09:30:00']);

        $rows = $feed($this->meera);
        $this->assertSame('2026-11-03T09:30:00+00:00', $rows[0]['at']);
        $this->assertCount(1, $rows);
        $this->assertSame(
            ['needs', 'You owe Ravi', 'Shared expenses', '/apps/our-exchange/expenses', 'Settle', 'Ravi'],
            [$rows[0]['kind'], $rows[0]['title'], $rows[0]['detail'], $rows[0]['href'], $rows[0]['action'], $rows[0]['person']['name']],
        );
        $this->assertDoesNotMatchRegularExpression('/2000|3000|20\.00|Dinner|Bulbs|Trip|Flat/', (string) json_encode($rows));

        $this->app->forgetScopedInstances();
        $this->assertSame(['You owe Meera'], array_column($feed($this->asha), 'title'));
        $this->app->forgetScopedInstances();
        $this->assertSame([], $feed($this->ravi));
    }

    public function test_the_landing_totals_what_the_viewer_owes_and_is_owed(): void
    {
        $this->actingAs($this->meera)->get('/apps/our-exchange')->assertInertia(fn ($page) => $page
            ->where('mailboxSummary.expenses', ['owed' => 2500, 'owing' => 2000])
            ->where('mailboxSummary.expenses_action_needed', 1)
            ->where('mailboxPeeks.expenses', [['name' => 'Ravi', 'net' => -2000], ['name' => 'Asha', 'net' => 2500]]));

        $this->app->forgetScopedInstances();
        $this->actingAs($this->kabir)->get('/apps/our-exchange')->assertInertia(fn ($page) => $page
            ->where('mailboxSummary.expenses', ['owed' => 0, 'owing' => 3000])
            ->where('mailboxPeeks.expenses', [['name' => 'Ravi', 'net' => -3000]]));
    }
}
