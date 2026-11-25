<?php

namespace Database\Factories;

use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Members live in a pivot, so they are attached after creation: use ->of($ravi, $meera). The
 * General group is made by the migration; fetch it with ExpenseGroup::general().
 *
 * @extends Factory<ExpenseGroup>
 */
class ExpenseGroupFactory extends Factory
{
    protected $model = ExpenseGroup::class;

    public function definition(): array
    {
        return ['name' => fake()->words(2, true)];
    }

    public function of(User ...$members): static
    {
        return $this
            ->state(fn (): array => ['created_by_id' => $members[0]->id])
            ->afterCreating(fn (ExpenseGroup $group) => $group->memberRows()->attach(array_map(fn (User $user): int => $user->id, $members)));
    }

    public function archived(): static
    {
        return $this->state(fn (): array => ['archived_at' => now()]);
    }
}
