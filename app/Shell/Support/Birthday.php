<?php

namespace App\Shell\Support;

use App\Shell\Models\User;
use Illuminate\Validation\Rule;

/**
 * A birthday is a whole date or nothing: a day and month without the year would leave the
 * morning push guessing an age. Once someone has one it can be changed but not cleared, so a
 * slip of the keyboard can't quietly drop it.
 */
final class Birthday
{
    /** @return list<mixed> */
    public static function rules(User $user): array
    {
        return [
            Rule::requiredIf($user->birthday !== null),
            'nullable',
            'date_format:Y-m-d',
            'after_or_equal:1900-01-01',
            'before_or_equal:'.Region::today()->toDateString(),
        ];
    }

    /** @return array<string, string> */
    public static function messages(): array
    {
        return [
            'birthday.required' => 'A birthday can be changed but not cleared.',
            'birthday.date_format' => 'Enter the whole date: day, month and year.',
            'birthday.after_or_equal' => 'Enter a date after 1900.',
            'birthday.before_or_equal' => "A birthday can't be in the future.",
        ];
    }
}
