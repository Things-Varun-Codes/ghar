<?php

namespace Database\Factories;

use App\Shell\Models\ShortLink;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ShortLink> */
class ShortLinkFactory extends Factory
{
    /** @var class-string<ShortLink> */
    protected $model = ShortLink::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'code' => ShortLink::generateCode(),
            'label' => $this->faker->words(3, true),
            'destination' => 'https://www.google.com/maps/dir/?api=1&destination=38.7223,-9.1393&travelmode=driving&dir_action=navigate',
            'enabled' => true,
            'created_by' => User::factory(),
        ];
    }

    public function disabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'enabled' => false,
        ]);
    }
}
