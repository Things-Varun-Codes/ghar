<?php

namespace Tests\Feature\Mailbox;

use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SplitsExpenses;
use Tests\TestCase;

/** Kabir leaves the household while Meera and he still owe Ravi for the trip dinner. */
class ExpenseFormerMemberTest extends TestCase
{
    use RefreshDatabase;
    use SplitsExpenses;

    private const BASE = '/apps/our-exchange/expenses';

    private Expense $dinner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedExpenseHousehold();
        $this->dinner = $this->addDinner();
        $this->kabir->forceFill(['removed_at' => now()])->save();
    }

    public function test_their_balance_stays_and_is_named_as_deleted(): void
    {
        $this->assertSame([$this->ravi->id => 6000, $this->meera->id => -3000, $this->kabir->id => -3000], $this->nets());

        $this->actingAs($this->ravi)->get(self::BASE.'/balances')->assertOk()->assertInertia(fn ($page) => $page
            ->where('overview.0.person.name', 'Kabir (deleted)')
            ->where('overview.0.person.former', true)
            ->where('overview.0.net', 3000)
        );
        $this->get(self::BASE)->assertOk()->assertInertia(fn ($page) => $page->missing('members.3'));

        $this->get(self::BASE."/groups/{$this->trip->id}")->assertOk()->assertInertia(fn ($page) => $page
            ->where('members', fn ($members) => collect($members)->contains(fn ($person) => $person['id'] === $this->kabir->id && $person['former'] === true))
        );
    }

    public function test_they_can_still_be_settled_with(): void
    {
        $this->actingAs($this->ravi)->post(self::BASE."/settle/{$this->kabir->id}", ['expected_net' => 3000])
            ->assertSessionHasNoErrors();

        $this->assertSame([$this->ravi->id => 3000, $this->meera->id => -3000], $this->nets());
    }

    public function test_they_cannot_go_on_anything_new(): void
    {
        $this->actingAs($this->ravi)->postJson(self::BASE."/groups/{$this->trip->id}/expenses", $this->dinner())
            ->assertStatus(422)->assertJsonValidationErrors('participant_ids');

        $this->postJson(self::BASE."/groups/{$this->trip->id}/expenses", $this->dinner(['paid_by_id' => $this->kabir->id, 'participant_ids' => [$this->ravi->id]]))
            ->assertStatus(422)->assertJsonValidationErrors('paid_by_id');

        $this->postJson(self::BASE.'/groups/'.ExpenseGroup::general()->id.'/expenses', $this->dinner())
            ->assertStatus(422)->assertJsonValidationErrors('participant_ids');

        $this->postJson(self::BASE.'/groups', ['name' => 'Again', 'member_ids' => [$this->kabir->id]])
            ->assertStatus(422)->assertJsonValidationErrors('member_ids.0');
    }

    public function test_an_expense_they_were_on_stays_editable_and_restorable(): void
    {
        $this->actingAs($this->ravi)->patch(self::BASE."/{$this->dinner->id}", $this->dinner(['title' => 'Supper']))
            ->assertSessionHasNoErrors();
        $this->assertSame('Supper', $this->dinner->refresh()->title);

        $this->delete(self::BASE."/{$this->dinner->id}")->assertSessionHasNoErrors();
        $this->patch(self::BASE."/{$this->dinner->id}/restore")->assertSessionHasNoErrors();
        $this->assertNull($this->dinner->refresh()->deleted_at);
    }

    public function test_the_group_keeps_them_when_its_name_or_other_members_change(): void
    {
        $this->actingAs($this->ravi)
            ->patch(self::BASE."/groups/{$this->trip->id}", ['name' => 'Coast', 'member_ids' => [$this->ravi->id, $this->meera->id, $this->kabir->id, $this->asha->id]])
            ->assertSessionHasNoErrors();

        $this->assertSame([$this->asha->id, $this->ravi->id, $this->meera->id, $this->kabir->id], $this->trip->refresh()->memberIds());
        $this->assertSame([$this->asha->id, $this->ravi->id, $this->meera->id], $this->trip->activeMemberIds());
    }
}
