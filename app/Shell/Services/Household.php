<?php

namespace App\Shell\Services;

use App\Shell\Models\User;
use App\Shell\Support\Person;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Every user who accepted an invite is a member until an admin removes them; there is no
 * separate membership table. A former member keeps their row, so what they made still names them.
 */
class Household
{
    /** @return Builder<User> */
    public function query(): Builder
    {
        return User::query()->whereNull('removed_at');
    }

    /**
     * Current and former members. Only for what has to keep naming a former member, such as a
     * balance still owed to them; anything new picks from query().
     *
     * @return Builder<User>
     */
    public function everyone(): Builder
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
     * A former member reads "Ravi (deleted)".
     */
    public function shortName(User $user): string
    {
        $first = self::firstOf($user->name);

        $this->firstNames ??= $this->members()
            ->countBy(fn (User $member): string => mb_strtolower(self::firstOf($member->name)))
            ->all();

        // A current member counts themselves; a former one clashes with any current namesake.
        $clash = ($this->firstNames[mb_strtolower($first)] ?? 0) > ($user->isFormer() ? 0 : 1);
        $name = $clash ? $user->name : $first;

        return $user->isFormer() ? "{$name} (deleted)" : $name;
    }

    private static function firstOf(string $name): string
    {
        return strtok(trim($name), " \t") ?: $name;
    }

    /** @return list<array{id: int, name: string, avatar_url: string|null}> */
    public function optionsFor(User $user): array
    {
        return $this->othersThan($user)
            ->map(fn (User $member): array => Person::short($member))
            ->values()
            ->all();
    }
}
