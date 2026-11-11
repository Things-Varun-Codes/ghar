<?php

namespace Database\Factories;

use App\MiniApps\Corner\Models\Activity;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Activity> */
class ActivityFactory extends Factory
{
    protected $model = Activity::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'notes' => null,
            'added_by_user_id' => User::factory(),
            'added_at' => now(),
            'done_at' => null,
            'done_by_user_id' => null,
        ];
    }

    public function done(User $by): static
    {
        return $this->state(fn () => [
            'done_at' => now(),
            'done_by_user_id' => $by->id,
        ]);
    }
}
