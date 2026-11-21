<?php

namespace Database\Factories;

use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Invitation> */
class InvitationFactory extends Factory
{
    /** @var class-string<Invitation> */
    protected $model = Invitation::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'email' => 'invitee@example.com',
            'role_name' => 'user',
            'token_hash' => hash('sha256', Str::random(64)),
            'expires_at' => now()->addDays(7),
            'invited_by_user_id' => User::factory()->admin(),
        ];
    }
}
