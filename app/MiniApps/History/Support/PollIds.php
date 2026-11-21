<?php

namespace App\MiniApps\History\Support;

use Illuminate\Http\Request;

/**
 * The ids in `?converting=1,2,3`: the rows whose photos the page saw still converting. The poll
 * names them because a row drops out of "still converting" the moment it is done, which is when
 * the page needs it.
 */
final class PollIds
{
    public const PARAM = 'converting';

    private const MAX = 100;

    /** @return list<int> */
    public static function from(Request $request): array
    {
        $raw = $request->query(self::PARAM);

        if (! is_string($raw)) {
            return [];
        }

        return array_slice(array_values(array_unique(array_map(
            'intval',
            array_filter(explode(',', $raw), 'ctype_digit'),
        ))), 0, self::MAX);
    }
}
