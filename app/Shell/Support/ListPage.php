<?php

namespace App\Shell\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Support\Header;

/**
 * A searchable, sortable cursor list page: the request's `sort`, `q` and (with a status column)
 * `filter`, resolved against what the controller allows, and the page built from them.
 */
final class ListPage
{
    /** @var array<int, string> */
    private array $searchColumns = [];

    private ?string $statusColumn = null;

    /** @param  array<string, array<int, array{0: string, 1: 'asc'|'desc'}>>  $sorts */
    private function __construct(
        private readonly Request $request,
        private readonly Builder $base,
        private readonly array $sorts,
    ) {}

    /**
     * $sorts maps a slug to ordered [column, direction] pairs. It must include `recent`, and
     * every sort must end in an `id` tiebreaker or the keyset cursor is unstable.
     *
     * @param  array<string, array<int, array{0: string, 1: 'asc'|'desc'}>>  $sorts
     */
    public static function make(Request $request, Builder $base, array $sorts): self
    {
        return new self($request, $base, $sorts);
    }

    /**
     * Newest first (`recent`) and oldest first (`oldest`) on one timestamp.
     *
     * @return array{recent: array<int, array{0: string, 1: 'asc'|'desc'}>, oldest: array<int, array{0: string, 1: 'asc'|'desc'}>}
     */
    public static function chronological(string $column): array
    {
        return [
            'recent' => [[$column, 'desc'], ['id', 'desc']],
            'oldest' => [[$column, 'asc'], ['id', 'asc']],
        ];
    }

    /** @param  array<int, string>  $columns */
    public function searchable(array $columns): self
    {
        $this->searchColumns = $columns;

        return $this;
    }

    /**
     * A nullable timestamp that splits the list into active and done, and enables `?filter`.
     * With no filter asked for, the page opens on the active rows, or on all of them when none
     * are active.
     */
    public function status(string $column): self
    {
        $this->statusColumn = $column;

        return $this;
    }

    public function sort(): string
    {
        $sort = $this->request->query('sort');

        return is_string($sort) && array_key_exists($sort, $this->sorts) ? $sort : 'recent';
    }

    /** @return list<string> */
    public function sortKeys(): array
    {
        return array_keys($this->sorts);
    }

    public function q(): ?string
    {
        return trim((string) $this->request->query('q')) ?: null;
    }

    /** Null when the list has a status but no valid filter was asked for: the default decides. */
    public function filter(): ?string
    {
        if ($this->statusColumn === null) {
            return 'all';
        }

        $filter = $this->request->query('filter');

        return in_array($filter, ['all', 'active', 'done'], true) ? $filter : null;
    }

    /**
     * The page under $key (an Inertia scroll prop), with `sort` and `q`, and `filter` when the
     * list has a status.
     *
     * @param  callable(mixed): mixed  $transform
     * @return array<string, mixed>
     */
    public function props(string $key, int $perPage, callable $transform): array
    {
        $sort = $this->sort();
        $q = $this->q();
        $filter = $this->filter();

        $query = clone $this->base;

        foreach ($this->sorts[$sort] as [$column, $direction]) {
            $query->orderBy($column, $direction);
        }

        $list = CursorList::make($query)->searchable($this->searchColumns, $q);

        if ($this->statusColumn !== null) {
            $list->status($this->statusColumn);
        }

        self::startOverUnlessLoadingMore($this->request, $key);

        $props = [
            $key => $list->scroll($filter ?? CursorList::ACTIVE_OR_ALL, $perPage, $transform),
            'sort' => $sort,
            'q' => $q,
        ];

        if ($this->statusColumn !== null) {
            $props['filter'] = $list->filter();
        }

        return $props;
    }

    /**
     * Any response but a load-more one (a filter, a mutation's redirect, a reload) shows the
     * first page again. Inertia's InfiniteScroll only forgets how far it had loaded when the
     * scroll prop says `reset`, which Inertia sets from this header; without it the next
     * load-more would continue from the old list's cursor. Call it before building the scroll
     * prop under $key.
     */
    public static function startOverUnlessLoadingMore(Request $request, string $key): void
    {
        if ($request->headers->has(Header::INFINITE_SCROLL_MERGE_INTENT)) {
            return;
        }

        $reset = array_filter(explode(',', (string) $request->header(Header::RESET)));

        if (! in_array($key, $reset, true)) {
            $request->headers->set(Header::RESET, implode(',', [...$reset, $key]));
        }
    }
}
