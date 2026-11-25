<?php

namespace Database\Factories;

use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\MiniApps\Mailbox\Support\ExpenseMath;
use App\Shell\Models\User;
use App\Shell\Support\Region;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * An expense is nothing without its shares: end with ->sharedBy(...) for an equal split,
 * ->owedBy([...]) for exact amounts, or ->paidTo($user) for a repayment.
 *
 * @extends Factory<Expense>
 */
class ExpenseFactory extends Factory
{
    protected $model = Expense::class;

    public function definition(): array
    {
        return [
            'group_id' => fn (): int => ExpenseGroup::general()->id,
            'paid_by_id' => User::factory(),
            'created_by_id' => fn (array $attributes): int => $attributes['paid_by_id'],
            'title' => fake()->words(2, true),
            'amount' => 10000,
            'spent_on' => Region::today()->toDateString(),
            'split_mode' => Expense::SPLIT_EQUAL,
            'is_settlement' => false,
        ];
    }

    public function sharedBy(User ...$participants): static
    {
        return $this->afterCreating(fn (Expense $expense) => $expense->writeShares(
            ExpenseMath::equalShares($expense->amount, array_map(fn (User $user): int => $user->id, $participants), $expense->id),
        ));
    }

    /** @param  array<int, int>  $shares  user id => share; they must add up to the amount */
    public function owedBy(array $shares): static
    {
        return $this
            ->state(fn (): array => ['split_mode' => Expense::SPLIT_EXACT])
            ->afterCreating(fn (Expense $expense) => $expense->writeShares($shares));
    }

    public function paidTo(User $receiver): static
    {
        return $this
            ->state(fn (): array => ['title' => 'Payment', 'split_mode' => Expense::SPLIT_EXACT, 'is_settlement' => true])
            ->afterCreating(fn (Expense $expense) => $expense->writeShares([$receiver->id => $expense->amount]));
    }
}
