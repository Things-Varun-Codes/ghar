<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SplitsExpenses;
use Tests\TestCase;

class ExpenseGroupOrderTest extends TestCase
{
    use RefreshDatabase;
    use SplitsExpenses;

    private const URL = '/apps/our-exchange/expenses/groups/order';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedExpenseHousehold();
    }

    /** @return list<string> */
    private function namesFor(User $viewer): array
    {
        $names = [];
        $this->actingAs($viewer)->get('/apps/our-exchange/expenses')->assertInertia(function ($page) use (&$names) {
            $names = array_column($page->toArray()['props']['groups'], 'name');
        });

        return $names;
    }

    public function test_each_person_keeps_their_own_order(): void
    {
        $general = ExpenseGroup::general();
        $flat = ExpenseGroup::factory()->of($this->ravi, $this->meera)->create(['name' => 'Flat']);

        // Oldest first until someone chooses otherwise.
        $this->assertSame(['General', 'Trip', 'Flat'], $this->namesFor($this->meera));

        $this->actingAs($this->meera)
            ->from('/apps/our-exchange/expenses')
            ->put(self::URL, ['ids' => [$this->trip->id, $general->id, $flat->id]])
            ->assertRedirect('/apps/our-exchange/expenses')
            ->assertSessionHasNoErrors();

        $this->assertSame(['Trip', 'General', 'Flat'], $this->namesFor($this->meera));
        // Ravi sees the same groups in the order he had.
        $this->assertSame(['General', 'Trip', 'Flat'], $this->namesFor($this->ravi));
    }

    public function test_a_new_group_comes_after_the_ordered_ones_and_archived_stay_last(): void
    {
        $general = ExpenseGroup::general();

        $this->actingAs($this->meera)->put(self::URL, ['ids' => [$this->trip->id, $general->id]])->assertSessionHasNoErrors();
        ExpenseGroup::factory()->of($this->meera, $this->asha)->archived()->create(['name' => 'Old flat']);
        ExpenseGroup::factory()->of($this->meera, $this->kabir)->create(['name' => 'Zoo club']);
        ExpenseGroup::factory()->of($this->meera, $this->kabir)->create(['name' => 'Aardvark club']);

        $this->assertSame(['Trip', 'General', 'Zoo club', 'Aardvark club', 'Old flat'], $this->namesFor($this->meera));
    }

    public function test_the_order_must_be_every_open_group_the_viewer_sees_once(): void
    {
        $general = ExpenseGroup::general();
        $old = ExpenseGroup::factory()->of($this->meera, $this->asha)->archived()->create(['name' => 'Old flat']);
        $theirs = ExpenseGroup::factory()->of($this->ravi, $this->kabir)->create(['name' => 'Not hers']);

        foreach ([
            [],
            ['ids' => [$this->trip->id]],
            ['ids' => [$this->trip->id, $general->id, $old->id]],
            ['ids' => [$this->trip->id, $general->id, $theirs->id]],
            ['ids' => [$this->trip->id, $this->trip->id]],
        ] as $payload) {
            $this->actingAs($this->meera)->from('/apps/our-exchange/expenses')->put(self::URL, $payload)->assertSessionHasErrors();
        }

        $this->assertDatabaseCount('personal_orders', 0);
    }
}
