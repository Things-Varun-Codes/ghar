<?php

namespace Database\Factories;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Recipients live in a pivot, so they are attached after creation: use ->to($user) (or
 * several users), optionally already read.
 *
 * @extends Factory<Bouquet>
 */
class BouquetFactory extends Factory
{
    protected $model = Bouquet::class;

    public function definition(): array
    {
        return [
            'sender_id' => User::factory(),
            'note' => fake()->optional()->sentence(),
            'image_key' => 'bouquets/'.fake()->uuid().'.png',
            'flowers' => [
                ['key' => 'red_rose', 'name' => 'Red Rose', 'meaning' => 'Love, the loud kind.'],
            ],
            'posted_at' => now(),
        ];
    }

    /** @param  User|iterable<User>  $recipients */
    public function to(User|iterable $recipients, bool $read = false): static
    {
        $recipients = $recipients instanceof User ? [$recipients] : $recipients;

        return $this->afterCreating(function (Bouquet $bouquet) use ($recipients, $read): void {
            foreach ($recipients as $recipient) {
                $bouquet->recipients()->attach($recipient->id, ['read_at' => $read ? now() : null]);
            }
        });
    }
}
