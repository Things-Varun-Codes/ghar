<?php

namespace App\Shell\Services;

use App\Shell\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Every user who accepted an invite is a member; there is no separate membership table.
 */
class Household
{
    /** @return Builder<User> */
    public function query(): Builder
    {
        return User::query();
    }

    /** @return Collection<int, User> */
    public function members(): Collection
    {
        return $this->query()->orderBy('name')->orderBy('id')->get();
    }

    /** @return Collection<int, User> */
    public function othersThan(User $user): Collection
    {
        return $this->query()->whereKeyNot($user->id)->orderBy('name')->orderBy('id')->get();
    }

    /** @return list<array{id: int, name: string}> */
    public function optionsFor(User $user): array
    {
        return $this->othersThan($user)
            ->map(fn (User $member): array => ['id' => $member->id, 'name' => $member->name])
            ->values()
            ->all();
    }
}
