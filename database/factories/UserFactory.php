<?php

namespace Database\Factories;

use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** @extends Factory<User> */
class UserFactory extends Factory
{
    /** @var class-string<User> */
    protected $model = User::class;

    protected static ?string $password;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'avatar_key' => null,
            'birthday' => null,
            'morning_memories' => true,
        ];
    }

    /** A picture on the media disk; the file itself is the test's to put there. */
    public function withAvatar(?string $key = null): static
    {
        return $this->state(fn (array $attributes) => [
            'avatar_key' => $key ?? 'avatars/'.Str::uuid().'.webp',
        ]);
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * afterCreating: Spatie needs the user id before it can attach the role.
     */
    public function admin(): static
    {
        return $this->afterCreating(function (User $user) {
            $user->assignRole('admin');
        });
    }
}
