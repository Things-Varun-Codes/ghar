<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Actions\AddPlace;
use App\MiniApps\Corner\Actions\ToggleListItemDone;
use App\MiniApps\Corner\Controllers\Concerns\ManagesListItems;
use App\MiniApps\Corner\Http\Requests\StorePlaceRequest;
use App\MiniApps\Corner\Http\Requests\UpdatePlaceRequest;
use App\MiniApps\Corner\Http\Resources\PlaceResource;
use App\MiniApps\Corner\Models\Place;
use App\Shell\Services\LinkableEntities;
use App\Shell\Support\CursorList;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlacesController
{
    use ManagesListItems;

    public function index(Request $request): Response
    {
        $base = Place::query()
            ->with('addedBy');

        $filter = in_array($request->query('filter'), ['active', 'done'], true)
            ? $request->query('filter')
            : 'all';

        $sort = $this->resolveSort($request);
        $q = trim((string) $request->query('q')) ?: null;

        $this->applyListOrder($base, $sort);

        return Inertia::render('MiniApps/Corner/Pages/Places/Index', [
            'places' => CursorList::make($base)
                ->status('done_at')
                ->searchable(['title', 'address'], $q)
                ->paginate($filter, 50, fn (Place $p) => app(PlaceResource::class)($p)),
            'filter' => $filter,
            'sort' => $sort,
            'q' => $q,
        ]);
    }

    public function show(string $place, LinkableEntities $linkable): Response
    {
        $model = Place::find($place);
        if ($model === null) {
            return Inertia::render('MiniApps/Corner/Pages/EntityNotFound', ['kind' => 'place']);
        }

        return Inertia::render('MiniApps/Corner/Pages/Places/Show', [
            'place' => app(PlaceResource::class)($model),
            'mentioned_in' => $linkable->referencesTo('corner.place', $model->id),
        ]);
    }

    public function store(StorePlaceRequest $request, AddPlace $action): RedirectResponse
    {
        $adder = $request->user();

        $action($request->validated(), $adder);

        return redirect('/apps/our-corner/places');
    }

    public function toggleDone(Request $request, Place $place, ToggleListItemDone $action): RedirectResponse
    {
        return $this->toggleItemDone($request, $place, $action);
    }

    public function update(UpdatePlaceRequest $request, Place $place): RedirectResponse
    {
        return $this->updateItem($request, $place);
    }

    public function destroy(Place $place): RedirectResponse
    {
        return $this->destroyItem($place);
    }
}
