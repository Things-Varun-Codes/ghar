<?php

namespace App\Shell\Support;

use Illuminate\Contracts\Pagination\CursorPaginator;

/**
 * Reads cursor meta off the paginator before mapping items into a fresh array. Never
 * ->through(): the paginator builds its cursor from the order-by columns of its items, so
 * transforming them in place breaks the next page.
 *
 * @param  callable(mixed): mixed  $transform
 */
class CursorPayload
{
    public static function make(CursorPaginator $paginator, callable $transform): array
    {
        return [
            'next_cursor' => $paginator->nextCursor()?->encode(),
            'prev_cursor' => $paginator->previousCursor()?->encode(),
            'next_page_url' => $paginator->nextPageUrl(),
            'prev_page_url' => $paginator->previousPageUrl(),
            'per_page' => $paginator->perPage(),
            'data' => collect($paginator->items())
                ->map($transform)
                ->values()
                ->all(),
        ];
    }
}
