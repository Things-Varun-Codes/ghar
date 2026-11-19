<?php

namespace Database\Factories;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventReaction;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<EventReaction> */
class EventReactionFactory extends Factory
{
    /** @var class-string<EventReaction> */
    protected $model = EventReaction::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'user_id' => User::factory(),
            'reaction' => fake()->randomElement(EventReaction::keys()),
        ];
    }
}
