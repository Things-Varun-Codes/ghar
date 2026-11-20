<?php

namespace Database\Factories;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventComment;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<EventComment> */
class EventCommentFactory extends Factory
{
    /** @var class-string<EventComment> */
    protected $model = EventComment::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'author_id' => User::factory(),
            'body' => fake()->sentence(),
        ];
    }
}
