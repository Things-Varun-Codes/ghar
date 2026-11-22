<?php

namespace App\Shell\Models;

use App\Enums\Theme;
use App\Shell\Notifications\ResetPasswordNotification;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\TwoFactorAuthenticatable;
use NotificationChannels\WebPush\HasPushSubscriptions;
use Spatie\Permission\Traits\HasRoles;

// Roles are not mass-assignable, so no endpoint forwarding request input can escalate
// privilege.
/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property ?Carbon $email_verified_at
 * @property ?Carbon $last_login_at
 * @property string $password
 * @property ?string $avatar_key
 * @property ?Carbon $birthday
 * @property bool $morning_memories
 * @property Theme $theme
 * @property ?string $two_factor_secret
 * @property ?string $two_factor_recovery_codes
 * @property ?Carbon $two_factor_confirmed_at
 */
// avatar_key isn't fillable either: it names an object on the media disk, and a key from
// request input could point a signed URL at someone else's file. Set it with forceFill.
#[Fillable(['name', 'email', 'password', 'birthday', 'morning_memories', 'theme'])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasPushSubscriptions, HasRoles, Notifiable, TwoFactorAuthenticatable;

    protected static function newFactory(): Factory
    {
        return UserFactory::new();
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    public function firstName(): string
    {
        return explode(' ', $this->name)[0];
    }

    /** Whoever made a thing may change it, and so may an admin. */
    public function makerOrAdmin(?int $makerId): bool
    {
        return $makerId === $this->id || $this->can('admin');
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'birthday' => 'date',
            'morning_memories' => 'boolean',
            'theme' => Theme::class,
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
