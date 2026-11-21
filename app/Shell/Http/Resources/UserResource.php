<?php

namespace App\Shell\Http\Resources;

use App\Shell\Models\User;
use App\Shell\Support\Person;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Spatie\Permission\Models\Role;

/** @property-read User $resource */
class UserResource extends JsonResource
{
    /**
     * @return array{
     *     id: int,
     *     name: string,
     *     avatar_url: string|null,
     *     email: string,
     *     last_login_at: string|null,
     *     two_factor: bool,
     *     roles: array<int, array{name: string}>,
     * }
     */
    public function toArray(Request $request): array
    {
        $user = $this->resource;
        \assert($user instanceof User);

        return [
            ...Person::of($user),
            'email' => $user->email,
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'two_factor' => $user->two_factor_confirmed_at !== null,
            'roles' => $user->roles->map(fn (Role $role): array => ['name' => $role->name])->all(),
        ];
    }
}
