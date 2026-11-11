<?php

namespace App\Shell\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Both the page and the {all,active,done} counts derive from one caller-built query, so
 * search and visibility constraints narrow them together.
 */
class CursorList
{
    protected Builder $base;

    protected ?string $statusColumn = null;

    private function __construct(Builder $base)
    {
        $this->base = $base;
    }

    public static function make(Builder $base): self
    {
        return new self($base);
    }

    public function status(string $column): self
    {
        $this->statusColumn = $column;

        return $this;
    }

    /** @param  array<int, string>  $columns */
    public function searchable(array $columns, ?string $q = null): self
    {
        $term = trim((string) $q);

        if ($term === '') {
            return $this;
        }

        $like = self::containsPattern($term);

        $this->base->where(function ($query) use ($columns, $like): void {
            foreach ($columns as $column) {
                $query->orWhere($column, 'ilike', $like);
            }
        });

        return $this;
    }

    /**
     * A LIKE pattern matching $term anywhere, with its wildcards escaped so a literal '%' or
     * '_' in the search box doesn't act as one.
     */
    public static function containsPattern(string $term): string
    {
        return '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%';
    }

    /**
     * @param  callable(mixed): mixed  $transform
     * @return array{data: array, next_cursor: ?string, prev_cursor: ?string,
     *               next_page_url: ?string, prev_page_url: ?string, per_page: int,
     *               counts: array{all: int, active: int, done: int}}
     */
    public function paginate(string $filter, int $perPage, callable $transform): array
    {
        // Before cursorPaginate touches its clone: a Builder is stateful.
        $countsBase = clone $this->base;

        $all = (clone $countsBase)->count();
        $active = $this->statusColumn !== null
            ? (clone $countsBase)->whereNull($this->statusColumn)->count()
            : $all;
        $done = $this->statusColumn !== null
            ? (clone $countsBase)->whereNotNull($this->statusColumn)->count()
            : 0;

        $query = clone $this->base;

        if ($this->statusColumn !== null) {
            match ($filter) {
                'active' => $query->whereNull($this->statusColumn),
                'done' => $query->whereNotNull($this->statusColumn),
                default => null,
            };
        }

        $paginator = $query->cursorPaginate($perPage)->withQueryString();

        return array_merge(
            CursorPayload::make($paginator, $transform),
            [
                'counts' => [
                    'all' => $all,
                    'active' => $active,
                    'done' => $done,
                ],
            ],
        );
    }
}
