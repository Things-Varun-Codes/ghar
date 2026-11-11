<?php

namespace Database\Factories;

use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Challan> */
class ChallanFactory extends Factory
{
    protected $model = Challan::class;

    public function definition(): array
    {
        return [
            'issuer_id' => User::factory(),
            'recipient_id' => User::factory(),
            'ref_no' => sprintf('OC/%d/%06d', now()->year, fake()->unique()->numberBetween(1, 999999)),
            'offence' => mb_substr(fake()->sentence(), 0, 120),
            'incident_date' => fake()->optional()->dateTimeThisYear(),
            'incident_place' => fake()->optional()->city(),
            'is_repeat' => fake()->boolean(20),
            'penalty' => mb_substr(fake()->words(2, true), 0, 80),
            'remarks' => fake()->optional()->sentence(),
            'status' => Challan::STATUS_ISSUED,
            'settled_at' => null,
            'issued_at' => now(),
        ];
    }

    public function paid(): static
    {
        return $this->state(fn () => [
            'status' => Challan::STATUS_PAID,
            'settled_at' => now(),
        ]);
    }
}
