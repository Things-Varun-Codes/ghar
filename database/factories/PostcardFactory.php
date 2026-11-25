<?php

namespace Database\Factories;

use App\MiniApps\Mailbox\Models\Postcard;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Recipients live in a pivot, so they are attached after creation: use ->to($user) (or
 * several users), optionally already read.
 *
 * @extends Factory<Postcard>
 */
class PostcardFactory extends Factory
{
    protected $model = Postcard::class;

    public function definition(): array
    {
        return [
            'sender_id' => User::factory(),
            'note' => fake()->optional()->sentence(),
            'image_key' => 'postcards/'.fake()->uuid().'.png',
            'prompt' => 'A lighthouse at dusk.',
            'posted_at' => now(),
        ];
    }

    /** @param  User|iterable<User>  $recipients */
    public function to(User|iterable $recipients, bool $read = false): static
    {
        $recipients = $recipients instanceof User ? [$recipients] : $recipients;

        return $this->afterCreating(function (Postcard $postcard) use ($recipients, $read): void {
            foreach ($recipients as $recipient) {
                $postcard->recipients()->attach($recipient->id, ['read_at' => $read ? now() : null]);
            }
        });
    }
}
