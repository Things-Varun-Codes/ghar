<?php

namespace App\MiniApps\History\Support;

use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\Person;

/**
 * The members with a birthday, for the moment form's "Is this Meera's birthday?". Month and
 * day only: the form matches them against the moment's date.
 */
final class MemberBirthdays
{
    /** @return list<array{person: array{id: int, name: string, avatar_url: string|null}, month: int, day: int}> */
    public static function forForm(): array
    {
        return app(Household::class)->members()
            ->filter(fn (User $member): bool => $member->birthday !== null)
            ->map(fn (User $member): array => [
                'person' => Person::of($member),
                'month' => $member->birthday->month,
                'day' => $member->birthday->day,
            ])
            ->values()
            ->all();
    }
}
