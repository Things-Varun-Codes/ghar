<?php

namespace Database\Factories;

use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Recipients live in a pivot, so they are attached after creation: use ->to($user) (or
 * several users), optionally already read.
 *
 * @extends Factory<MailboxMessage>
 */
class MailboxMessageFactory extends Factory
{
    protected $model = MailboxMessage::class;

    public function definition(): array
    {
        return [
            'sender_id' => User::factory(),
            'body' => fake()->sentence(),
            'posted_at' => now(),
        ];
    }

    /** @param  User|iterable<User>  $recipients */
    public function to(User|iterable $recipients, bool $read = false): static
    {
        $recipients = $recipients instanceof User ? [$recipients] : $recipients;

        return $this->afterCreating(function (MailboxMessage $message) use ($recipients, $read): void {
            foreach ($recipients as $recipient) {
                $message->recipients()->attach($recipient->id, ['read_at' => $read ? now() : null]);
            }
        });
    }
}
