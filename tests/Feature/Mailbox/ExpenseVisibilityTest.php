<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseActivity;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\Shell\Services\Rooms;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\SplitsExpenses;
use Tests\TestCase;

class ExpenseVisibilityTest extends TestCase
{
    use RefreshDatabase;
    use SplitsExpenses;

    private Expense $dinner;

    private Expense $deleted;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedExpenseHousehold();

        $this->dinner = $this->addDinner();
        $this->deleted = $this->addDinner(['title' => 'Entered twice']);
        $this->delete("/apps/our-exchange/expenses/{$this->deleted->id}");
    }

    /**
     * Every expenses route, taken from the router so a new one can't be left out, with a
     * payload that would succeed for a member.
     *
     * @return list<array{0: string, 1: string, 2: array<string, mixed>, 3: string}> method, URL, payload, route name
     */
    private function everyRoute(): array
    {
        $payloads = [
            'store' => $this->dinner(),
            'update' => $this->dinner(['title' => 'Supper']),
            'groups.update' => ['name' => 'Renamed'],
            'settlements.store' => ['from_id' => $this->meera->id, 'to_id' => $this->ravi->id, 'amount' => 100],
            'groups.store' => ['name' => 'New', 'member_ids' => [$this->meera->id]],
            'settle' => ['expected_net' => 3000],
        ];

        return collect(Route::getRoutes()->getRoutes())
            ->filter(fn (RoutingRoute $route): bool => str_starts_with((string) $route->getName(), 'apps.our-exchange.expenses.'))
            ->map(function (RoutingRoute $route) use ($payloads): array {
                $name = substr((string) $route->getName(), strlen('apps.our-exchange.expenses.'));

                return [
                    $route->methods()[0],
                    '/'.strtr($route->uri(), [
                        '{group}' => (string) $this->trip->id,
                        '{expense}' => (string) ($name === 'restore' ? $this->deleted->id : $this->dinner->id),
                        '{user}' => (string) $this->meera->id,
                    ]),
                    $payloads[$name] ?? [],
                    $name,
                ];
            })
            ->values()
            ->all();
    }

    /** @param  array<string, mixed>  $payload */
    private function hit(string $method, string $url, array $payload): TestResponse
    {
        // A fresh request each time: the room switches are read once per request.
        app()->forgetScopedInstances();

        return $this->json($method, $url, $payload);
    }

    public function test_nobody_outside_a_group_gets_into_it_and_an_admin_is_no_exception(): void
    {
        $routes = $this->everyRoute();
        $this->assertCount(16, $routes);
        $before = [Expense::withTrashed()->count(), ExpenseActivity::query()->count(), ExpenseGroup::query()->count()];

        $this->actingAs($this->asha);
        $onAGroup = 0;

        foreach ($routes as [$method, $url, $payload, $name]) {
            // These aren't about one group: anyone may list, start a group, order theirs or try to settle.
            if (in_array($name, ['index', 'balances', 'groups.store', 'groups.order', 'settle'], true)) {
                continue;
            }

            $this->hit($method, $url, $payload)->assertForbidden();
            $onAGroup++;
        }

        $this->assertSame(11, $onAGroup);
        $this->hit('POST', "/apps/our-exchange/expenses/settle/{$this->ravi->id}", ['expected_net' => 3000])->assertStatus(422);
        // Naming a group you aren't in is refused like any other wrong set.
        $this->hit('PUT', '/apps/our-exchange/expenses/groups/order', ['ids' => [$this->trip->id, ExpenseGroup::general()->id]])->assertStatus(422);
        $this->assertSame($before, [Expense::withTrashed()->count(), ExpenseActivity::query()->count(), ExpenseGroup::query()->count()]);
        $this->assertSame('Trip', $this->trip->refresh()->name);
        $this->assertSame('Dinner', $this->dinner->refresh()->title);
        $this->assertTrue($this->deleted->refresh()->trashed());

        $this->get('/apps/our-exchange/expenses')->assertOk()->assertInertia(fn ($page) => $page
            ->component('MiniApps/Mailbox/Pages/Expenses/Index')
            ->has('groups', 1)
            ->where('groups.0.is_general', true)
            ->where('overall', 0)
            ->missing('overview')
            ->has('members', 4));
        $this->get('/apps/our-exchange/expenses/balances')->assertOk()->assertInertia(fn ($page) => $page
            ->component('MiniApps/Mailbox/Pages/Expenses/Balances')
            ->where('overall', 0)
            ->where('overview', []));
        $this->assertStringNotContainsString('Trip', (string) json_encode($this->get('/apps/our-exchange/expenses')->viewData('page')));
        $this->assertSame(0, ExpenseGroup::query()->visibleTo($this->asha)->whereKey($this->trip->id)->count());
        $this->assertSame(0, Expense::query()->visibleTo($this->asha)->count());
        $this->assertSame(1, Expense::query()->visibleTo($this->kabir)->count());
    }

    public function test_a_member_sees_their_groups_and_what_they_are_up_or_down(): void
    {
        ExpenseGroup::factory()->of($this->meera, $this->asha)->archived()->create(['name' => 'Old flat']);

        $this->actingAs($this->meera)->get('/apps/our-exchange/expenses')->assertInertia(fn ($page) => $page
            ->where('groups', [
                ['id' => ExpenseGroup::general()->id, 'name' => 'General', 'is_general' => true, 'archived' => false, 'member_ids' => [$this->asha->id, $this->ravi->id, $this->meera->id, $this->kabir->id], 'can' => ['write' => true, 'manage' => false, 'archive' => false, 'delete' => false], 'net' => 0],
                ['id' => $this->trip->id, 'name' => 'Trip', 'is_general' => false, 'archived' => false, 'member_ids' => [$this->ravi->id, $this->meera->id, $this->kabir->id], 'can' => ['write' => true, 'manage' => true, 'archive' => false, 'delete' => false], 'net' => -3000],
                ['id' => ExpenseGroup::query()->where('name', 'Old flat')->value('id'), 'name' => 'Old flat', 'is_general' => false, 'archived' => true, 'member_ids' => [$this->asha->id, $this->meera->id], 'can' => ['write' => false, 'manage' => true, 'archive' => false, 'delete' => true], 'net' => 0],
            ])
            ->where('overall', -3000)
            ->missing('overview'));

        $this->get('/apps/our-exchange/expenses/balances')->assertOk()->assertInertia(fn ($page) => $page
            ->where('overall', -3000)
            ->has('overview', 1)
            ->where('overview.0.person.name', 'Ravi')
            ->where('overview.0.net', -3000)
            ->missing('overview.0.person.avatar_key'));
    }

    public function test_an_expense_has_its_own_page_with_only_its_own_activity(): void
    {
        $this->actingAs($this->meera)->get("/apps/our-exchange/expenses/{$this->dinner->id}")->assertOk()->assertInertia(fn ($page) => $page
            ->component('MiniApps/Mailbox/Pages/Expenses/Show')
            ->where('expense.id', $this->dinner->id)
            ->where('expense.title', 'Dinner')
            ->where('deleted', false)
            ->where('group', ['id' => $this->trip->id, 'name' => 'Trip'])
            ->where('can', ['edit' => true, 'delete' => true])
            ->has('activity', ExpenseActivity::query()->where('expense_id', $this->dinner->id)->count())
            ->where('activity.0.expense_id', $this->dinner->id)
            ->missing('household.0.avatar_key'));

        $this->assertGreaterThan(
            ExpenseActivity::query()->where('expense_id', $this->dinner->id)->count(),
            ExpenseActivity::query()->where('group_id', $this->trip->id)->count(),
        );

        // A deleted one still opens, to be read or restored, and can't be changed.
        $this->get("/apps/our-exchange/expenses/{$this->deleted->id}")->assertOk()->assertInertia(fn ($page) => $page
            ->where('deleted', true)
            ->where('can', ['edit' => false, 'delete' => false])
            ->where('activity.0.action', 'expense.deleted')
            ->where('activity.0.can_restore', true));

        $this->trip->forceFill(['archived_at' => now()])->save();
        $this->get("/apps/our-exchange/expenses/{$this->dinner->id}")->assertOk()->assertInertia(fn ($page) => $page
            ->where('can', ['edit' => false, 'delete' => false]));

        $this->actingAs($this->asha)->get("/apps/our-exchange/expenses/{$this->deleted->id}")->assertForbidden();
    }

    public function test_a_repayment_opens_too_and_is_never_edited(): void
    {
        $this->actingAs($this->meera)->post("/apps/our-exchange/expenses/groups/{$this->trip->id}/settlements", [
            'from_id' => $this->meera->id, 'to_id' => $this->ravi->id, 'amount' => 100,
        ]);
        $payment = Expense::query()->where('is_settlement', true)->latest('id')->firstOrFail();

        $this->get("/apps/our-exchange/expenses/{$payment->id}")->assertOk()->assertInertia(fn ($page) => $page
            ->where('expense.is_settlement', true)
            ->where('can', ['edit' => false, 'delete' => true])
            ->has('activity', 1));

        $this->delete("/apps/our-exchange/expenses/{$payment->id}")
            ->assertRedirect("/apps/our-exchange/expenses/groups/{$this->trip->id}");
    }

    public function test_a_general_expense_is_seen_by_everyone(): void
    {
        $general = ExpenseGroup::general();
        $this->addDinner(['title' => 'Gas cylinder', 'participant_ids' => [$this->ravi->id, $this->meera->id]], $general);

        foreach ([$this->asha, $this->ravi, $this->meera, $this->kabir] as $member) {
            $this->actingAs($member)->get("/apps/our-exchange/expenses/groups/{$general->id}")->assertOk()->assertInertia(fn ($page) => $page
                ->where('expenses.data.0.title', 'Gas cylinder')
                ->where('group.can.manage', false)
                ->has('members', 4));
        }
    }

    public function test_the_activity_is_for_members_only(): void
    {
        $url = "/apps/our-exchange/expenses/groups/{$this->trip->id}?tab=activity";

        $this->actingAs($this->asha)->get($url)->assertForbidden();
        $this->actingAs($this->kabir)->get($url)->assertOk()->assertInertia(fn ($page) => $page
            ->where('tab', 'activity')
            ->has('activity', 3)
            ->where('activity.0.action', 'expense.deleted')
            ->where('activity.0.actor.name', 'Ravi')
            ->where('activity.2.data.title', 'Dinner'));
    }

    public function test_switched_off_every_route_is_gone_and_nothing_shows_elsewhere(): void
    {
        app(Rooms::class)->setOption('our-exchange', 'expenses', false);
        $this->actingAs($this->meera);

        foreach ($this->everyRoute() as [$method, $url, $payload]) {
            $this->hit($method, $url, $payload)->assertNotFound();
        }

        app()->forgetScopedInstances();
        $this->get('/apps/our-exchange')->assertOk()->assertInertia(fn ($page) => $page
            ->where('types', fn ($types) => ! collect($types)->contains('key', 'expenses'))
            ->where('mailboxSummary.expenses', ['owed' => 0, 'owing' => 0])
            ->where('mailboxSummary.expenses_action_needed', 0)
            ->missing('mailboxPeeks.expenses'));

        app()->forgetScopedInstances();
        $this->get('/dashboard')->assertInertia(fn ($page) => $page->where('feed', []));
    }
}
