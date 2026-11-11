<?php

namespace App\Shell\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait ResolvesListSort
{
    /**
     * Sort slug => ordered [column, direction] pairs. Must include `recent`, and every list
     * must end in an `id` tiebreaker or the keyset cursor is unstable.
     *
     * @return array<string, array<int, array{0: string, 1: 'asc'|'desc'}>>
     */
    abstract protected function sortOptions(): array;

    protected function resolveSort(Request $request): string
    {
        $sort = $request->query('sort');

        return is_string($sort) && array_key_exists($sort, $this->sortOptions())
            ? $sort
            : 'recent';
    }

    protected function applyListOrder(Builder $base, string $sort): void
    {
        foreach ($this->sortOptions()[$sort] as [$column, $direction]) {
            $base->orderBy($column, $direction);
        }
    }
}
