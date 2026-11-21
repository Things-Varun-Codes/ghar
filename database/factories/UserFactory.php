<?php

namespace Database\Factories;

use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Fortify\Fortify;

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
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ];
    }

    /** A picture on the media disk; the file itself is the test's to put there. */
    public function withAvatar(?string $key = null): static
    {
        return $this->state(fn (array $attributes) => [
            'avatar_key' => $key ?? 'avatars/'.Str::uuid().'.webp',
        ]);
    }

    /**
     * Two-step sign-in on, with a known secret (base32) and recovery codes.
     *
     * @param  list<string>  $recoveryCodes
     */
    public function withTwoFactor(string $secret = 'JBSWY3DPEHPK3PXP', array $recoveryCodes = ['recovery-code-1', 'recovery-code-2']): static
    {
        return $this->state(fn (array $attributes) => [
            'two_factor_secret' => Fortify::currentEncrypter()->encrypt($secret),
            'two_factor_recovery_codes' => Fortify::currentEncrypter()->encrypt(json_encode($recoveryCodes)),
            'two_factor_confirmed_at' => now(),
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
