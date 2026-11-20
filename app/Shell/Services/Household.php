<?php

namespace App\Shell\Services;

use App\Shell\Models\User;
use App\Shell\Support\Person;
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

    /** @var array<string, int>|null how many members share each first name */
    private ?array $firstNames = null;

    /**
     * How a family says it: "Ravi", unless two members are both Ravi, then the full name.
     */
    public function shortName(User $user): string
    {
        $first = self::firstOf($user->name);

        $this->firstNames ??= $this->members()
            ->countBy(fn (User $member): string => mb_strtolower(self::firstOf($member->name)))
            ->all();

        return ($this->firstNames[mb_strtolower($first)] ?? 0) > 1 ? $user->name : $first;
    }

    private static function firstOf(string $name): string
    {
        return strtok(trim($name), " \t") ?: $name;
    }

    /** @return list<array{id: int, name: string, avatar_url: string|null}> */
    public function optionsFor(User $user): array
    {
        return $this->othersThan($user)
            ->map(fn (User $member): array => Person::of($member))
            ->values()
            ->all();
    }
}
