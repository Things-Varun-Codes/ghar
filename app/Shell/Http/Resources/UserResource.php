<?php

namespace App\Shell\Http\Resources;

use App\Shell\Models\User;
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
     *     email: string,
     *     last_login_at: string|null,
     *     roles: array<int, array{name: string}>,
     * }
     */
    public function toArray(Request $request): array
    {
        $user = $this->resource;
        \assert($user instanceof User);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'roles' => $user->roles->map(fn (Role $role): array => ['name' => $role->name])->all(),
        ];
    }
}
