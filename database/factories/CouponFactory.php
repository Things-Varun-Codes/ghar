<?php

namespace Database\Factories;

use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Coupon> */
class CouponFactory extends Factory
{
    protected $model = Coupon::class;

    public function definition(): array
    {
        $quantity = fake()->numberBetween(1, 5);

        return [
            'issuer_id' => User::factory(),
            'recipient_id' => User::factory(),
            'code' => sprintf('GC/%d/%06d', now()->year, fake()->unique()->numberBetween(1, 999999)),
            'title' => mb_substr(fake()->words(2, true), 0, 80),
            'description' => fake()->optional()->sentence(),
            'quantity' => $quantity,
            'redeemed_count' => 0,
            'expires_at' => fake()->optional()->dateTimeBetween('now', '+2 months'),
            'status' => Coupon::STATUS_ISSUED,
            'requested_at' => null,
            'issued_at' => now(),
            'last_fulfilled_at' => null,
        ];
    }

    public function requested(): static
    {
        return $this->state(fn () => [
            'status' => Coupon::STATUS_REQUESTED,
            'requested_at' => now(),
        ]);
    }

    public function depleted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Coupon::STATUS_DEPLETED,
            'redeemed_count' => $attributes['quantity'] ?? 1,
            'requested_at' => null,
            'last_fulfilled_at' => now(),
        ]);
    }
}
