<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Actions\AddItem;
use App\MiniApps\Corner\Actions\ToggleListItemDone;
use App\MiniApps\Corner\Actions\UpdateItem;
use App\MiniApps\Corner\Http\Requests\StoreItemRequest;
use App\MiniApps\Corner\Http\Requests\UpdateItemRequest;
use App\MiniApps\Corner\Http\Resources\ItemResource;
use App\MiniApps\Corner\Http\Resources\ListResource;
use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\CornerLinks;
use App\MiniApps\Corner\Support\ListKind;
use App\Shell\Services\LinkableEntities;
use App\Shell\Support\CursorList;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ItemsController
{
    private const PER_PAGE = 50;

    /**
     * Sort slug => ordered [column, direction] pairs, each ending in an id tiebreaker so the
     * keyset cursor is stable.
     *
     * @return array<string, list<array{0: string, 1: 'asc'|'desc'}>>
     */
    private static function sortOptions(ListKind $kind): array
    {
        $options = [
            'recent' => [['added_at', 'desc'], ['id', 'desc']],
            'title' => [['title', 'asc'], ['id', 'asc']],
        ];

        if ($kind === ListKind::Link) {
            $options['artist'] = [['author', 'asc'], ['id', 'asc']];
        }

        return $options;
    }

    public function index(Request $request, string $list): Response
    {
        $model = CornerList::query()->where('slug', $list)->first();

        if ($model === null) {
            return Inertia::render('MiniApps/Corner/Pages/EntityNotFound', ['kind' => 'list']);
        }

        $options = self::sortOptions($model->kind);
        $sort = is_string($request->query('sort')) && array_key_exists($request->query('sort'), $options)
            ? $request->query('sort')
            : 'recent';
        $filter = in_array($request->query('filter'), ['active', 'done'], true)
            ? $request->query('filter')
            : 'all';
        $q = trim((string) $request->query('q')) ?: null;

        $base = $model->items()->getQuery()->with('addedBy');
        foreach ($options[$sort] as [$column, $direction]) {
            $base->orderBy($column, $direction);
        }

        return Inertia::render('MiniApps/Corner/Pages/List', [
            'list' => $this->listPayload($request, $model),
            'items' => CursorList::make($base)
                ->status('done_at')
                ->searchable($model->kind->searchColumns(), $q)
                ->paginate($filter, self::PER_PAGE, fn (Item $i) => app(ItemResource::class)($i)),
            'filter' => $filter,
            'sort' => $sort,
            'sorts' => array_keys($options),
            'q' => $q,
        ]);
    }

    /**
     * Old links from History and notifications carry the id an item had before lists were
     * customisable; they still land on the item.
     */
    public function show(Request $request, string $list, string $item, LinkableEntities $linkable): Response
    {
        $model = CornerList::query()->where('slug', $list)->first();
        $found = null;

        if ($model !== null && ctype_digit($item)) {
            $found = $model->items()->whereKey((int) $item)->first()
                ?? $model->items()->where('legacy_id', (int) $item)->first();
        }

        if ($model === null || $found === null) {
            return Inertia::render('MiniApps/Corner/Pages/EntityNotFound', [
                'kind' => $model === null ? 'list' : 'item',
            ]);
        }

        $found->setRelation('list', $model);

        return Inertia::render('MiniApps/Corner/Pages/Item', [
            'list' => $this->listPayload($request, $model),
            'item' => app(ItemResource::class)($found),
            'mentioned_in' => CornerLinks::mentionsOf($found, $linkable),
        ]);
    }

    public function store(StoreItemRequest $request, CornerList $list, AddItem $action): RedirectResponse
    {
        $action($list, $request->validated(), $request->user());

        FlashToast::success("Added to {$list->name}.");

        // No query string: a new item must show even if a search or filter was active.
        return redirect()->route('apps.our-corner.lists.show', $list->slug);
    }

    public function update(UpdateItemRequest $request, Item $item, UpdateItem $action): RedirectResponse
    {
        $action($item, $request->validated());

        return redirect()->back();
    }

    public function toggleDone(Request $request, Item $item, ToggleListItemDone $action): RedirectResponse
    {
        Gate::authorize('toggleDone', $item);

        $action($item, $request->user());

        return redirect()->back();
    }

    public function destroy(Item $item): RedirectResponse
    {
        Gate::authorize('delete', $item);

        $item->delete();

        return redirect()->back();
    }

    /** @return array<string, mixed> */
    private function listPayload(Request $request, CornerList $list): array
    {
        $viewer = $request->user();
        $itemsByOthers = $list->items()->where('added_by_user_id', '!=', $viewer->id)->count();

        return app(ListResource::class)($list, $viewer, $itemsByOthers);
    }
}
