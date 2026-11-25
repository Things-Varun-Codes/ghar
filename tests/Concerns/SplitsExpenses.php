<?php

namespace Tests\Concerns;

use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\MiniApps\Mailbox\Support\ExpenseBalances;
use App\Shell\Models\User;
use App\Shell\Support\Region;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Notification;

/**
 * Asha is the admin and is in nobody's group but General; Ravi, Meera and Kabir share "Trip".
 */
trait SplitsExpenses
{
    private User $asha;

    private User $ravi;

    private User $meera;

    private User $kabir;

    private ExpenseGroup $trip;

    private function seedExpenseHousehold(): void
    {
        $this->seed(RoleSeeder::class);
        Notification::fake();

        $this->asha = User::factory()->admin()->create(['name' => 'Asha Rao']);
        $this->ravi = User::factory()->create(['name' => 'Ravi Rao']);
        $this->meera = User::factory()->create(['name' => 'Meera Rao']);
        $this->kabir = User::factory()->create(['name' => 'Kabir Rao']);
        $this->trip = ExpenseGroup::factory()->of($this->ravi, $this->meera, $this->kabir)->create(['name' => 'Trip']);
    }

    /**
     * Ravi paid 9000 for the three of them, unless told otherwise.
     *
     * @param  array<string, mixed>  $over
     * @return array<string, mixed>
     */
    private function dinner(array $over = []): array
    {
        return [
            'title' => 'Dinner',
            'amount' => 9000,
            'spent_on' => Region::today()->toDateString(),
            'paid_by_id' => $this->ravi->id,
            'split_mode' => 'equal',
            'participant_ids' => [$this->ravi->id, $this->meera->id, $this->kabir->id],
            ...$over,
        ];
    }

    /** @param  array<string, mixed>  $over */
    private function addDinner(array $over = [], ?ExpenseGroup $group = null): Expense
    {
        $this->actingAs($this->ravi)
            ->post('/apps/our-exchange/expenses/groups/'.($group ?? $this->trip)->id.'/expenses', $this->dinner($over))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        return Expense::query()->latest('id')->firstOrFail();
    }

    /** @return array<int, int> */
    private function nets(?ExpenseGroup $group = null): array
    {
        return array_filter(ExpenseBalances::netsIn($group ?? $this->trip));
    }
}
