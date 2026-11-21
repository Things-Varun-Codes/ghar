<?php

namespace App\Shell\Support;

use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Database\Eloquent\Builder;
use Inertia\Inertia;
use Inertia\ScrollMetadata;
use Inertia\ScrollProp;

/**
 * Both the page and the {all,active,done} counts derive from one caller-built query, so
 * search and visibility constraints narrow them together.
 */
class CursorList
{
    protected Builder $base;

    /** The active rows, or all of them when none are active. */
    public const ACTIVE_OR_ALL = 'active-or-all';

    protected ?string $statusColumn = null;

    private string $filter = 'all';

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

    /** The filter the last page was built with, ACTIVE_OR_ALL resolved. */
    public function filter(): string
    {
        return $this->filter;
    }

    /**
     * @param  callable(mixed): mixed  $transform
     * @return array{data: array, next_cursor: ?string, prev_cursor: ?string,
     *               next_page_url: ?string, prev_page_url: ?string, per_page: int,
     *               counts: array{all: int, active: int, done: int}}
     */
    public function paginate(string $filter, int $perPage, callable $transform): array
    {
        return $this->build($filter, $perPage, $transform)[0];
    }

    /**
     * The same page as an Inertia scroll prop, for the client's InfiniteScroll: a load-more
     * request appends to `data`, anything else replaces the list.
     *
     * @param  callable(mixed): mixed  $transform
     * @return ScrollProp<array<string, mixed>>
     */
    public function scroll(string $filter, int $perPage, callable $transform): ScrollProp
    {
        [$payload, $paginator] = $this->build($filter, $perPage, $transform);

        return Inertia::scroll($payload, 'data', ScrollMetadata::fromPaginator($paginator));
    }

    /**
     * @param  callable(mixed): mixed  $transform
     * @return array{0: array{data: array, next_cursor: ?string, prev_cursor: ?string,
     *               next_page_url: ?string, prev_page_url: ?string, per_page: int,
     *               counts: array{all: int, active: int, done: int}}, 1: CursorPaginator<int, mixed>}
     */
    private function build(string $filter, int $perPage, callable $transform): array
    {
        // Only the tallies: a base that selects its own columns (one with a join) can't be counted
        // alongside them.
        $countsQuery = (clone $this->base)->toBase()->reorder()->select([]);

        if ($this->statusColumn !== null) {
            $row = $countsQuery
                ->selectRaw('count(*) as total, count('.$countsQuery->getGrammar()->wrap($this->statusColumn).') as done')
                ->first();
            $all = (int) $row->total;
            $done = (int) $row->done;
            $active = $all - $done;
        } else {
            $all = $countsQuery->count();
            $active = $all;
            $done = 0;
        }

        if ($filter === self::ACTIVE_OR_ALL) {
            $filter = $active > 0 ? 'active' : 'all';
        }

        $this->filter = $filter;

        $query = clone $this->base;

        if ($this->statusColumn !== null) {
            match ($filter) {
                'active' => $query->whereNull($this->statusColumn),
                'done' => $query->whereNotNull($this->statusColumn),
                default => null,
            };
        }

        $paginator = $query->cursorPaginate($perPage)->withQueryString();

        $payload = array_merge(
            CursorPayload::make($paginator, $transform),
            [
                'counts' => [
                    'all' => $all,
                    'active' => $active,
                    'done' => $done,
                ],
            ],
        );

        return [$payload, $paginator];
    }
}
