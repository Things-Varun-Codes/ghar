<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Actions\AddItem;
use App\MiniApps\Corner\Actions\ToggleListItemDone;
use App\MiniApps\Corner\Actions\UpdateItem;
use App\MiniApps\Corner\Http\Requests\SaveItemRequest;
use App\MiniApps\Corner\Http\Resources\ItemResource;
use App\MiniApps\Corner\Http\Resources\ListResource;
use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\CornerLinks;
use App\Shell\Services\LinkableEntities;
use App\Shell\Support\FlashToast;
use App\Shell\Support\ListPage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ItemsController
{
    private const PER_PAGE = 50;

    private const SEARCH_COLUMNS = ['title', 'notes', 'author', 'site_name', 'location_label', 'address'];

    private const SORTS = [
        'recent' => [['added_at', 'desc'], ['id', 'desc']],
        'title' => [['title', 'asc'], ['id', 'asc']],
    ];

    public function index(Request $request, string $list): Response
    {
        $model = CornerList::query()->where('slug', $list)->first();

        if ($model === null) {
            return Inertia::render('MiniApps/Corner/Pages/EntityNotFound', ['kind' => 'list']);
        }

        $page = ListPage::make($request, $model->items()->getQuery()->with('addedBy'), self::SORTS)
            ->status('done_at')
            ->searchable(self::SEARCH_COLUMNS);

        return Inertia::render('MiniApps/Corner/Pages/List', [
            // A closure, so loading more items (`only: ['items']`) doesn't recount the list.
            'list' => fn () => $this->listPayload($request, $model),
            ...$page->props('items', self::PER_PAGE, fn (Item $i) => app(ItemResource::class)($i)),
            'sorts' => $page->sortKeys(),
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
            'list' => fn () => $this->listPayload($request, $model),
            'item' => app(ItemResource::class)($found),
            'mentioned_in' => CornerLinks::mentionsOf($found, $linkable),
        ]);
    }

    public function store(SaveItemRequest $request, CornerList $list, AddItem $action): RedirectResponse
    {
        $action($list, $request->validated(), $request->user());

        FlashToast::success("Added to {$list->name}.");

        // No query string: a new item must show even if a search or filter was active.
        return redirect()->route('apps.our-shelf.lists.show', $list->slug);
    }

    public function update(SaveItemRequest $request, Item $item, UpdateItem $action): RedirectResponse
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
        $itemsByOthers = $list->itemsAddedByOthersThan($viewer);

        return app(ListResource::class)($list, $viewer, $itemsByOthers);
    }
}
