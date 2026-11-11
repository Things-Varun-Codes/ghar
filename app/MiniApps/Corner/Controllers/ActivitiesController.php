<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Actions\AddActivity;
use App\MiniApps\Corner\Actions\ToggleListItemDone;
use App\MiniApps\Corner\Controllers\Concerns\ManagesListItems;
use App\MiniApps\Corner\Http\Requests\StoreActivityRequest;
use App\MiniApps\Corner\Http\Requests\UpdateActivityRequest;
use App\MiniApps\Corner\Http\Resources\ActivityResource;
use App\MiniApps\Corner\Models\Activity;
use App\Shell\Services\LinkableEntities;
use App\Shell\Support\CursorList;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivitiesController
{
    use ManagesListItems;

    public function index(Request $request): Response
    {
        $base = Activity::query()
            ->with('addedBy');

        $filter = in_array($request->query('filter'), ['active', 'done'], true)
            ? $request->query('filter')
            : 'all';

        $sort = $this->resolveSort($request);
        $q = trim((string) $request->query('q')) ?: null;

        $this->applyListOrder($base, $sort);

        return Inertia::render('MiniApps/Corner/Pages/Activities/Index', [
            'activities' => CursorList::make($base)
                ->status('done_at')
                ->searchable(['title', 'notes'], $q)
                ->paginate($filter, 50, fn (Activity $a) => app(ActivityResource::class)($a)),
            'filter' => $filter,
            'sort' => $sort,
            'q' => $q,
        ]);
    }

    public function show(string $activity, LinkableEntities $linkable): Response
    {
        $model = Activity::find($activity);
        if ($model === null) {
            return Inertia::render('MiniApps/Corner/Pages/EntityNotFound', ['kind' => 'activity']);
        }

        return Inertia::render('MiniApps/Corner/Pages/Activities/Show', [
            'activity' => app(ActivityResource::class)($model),
            'mentioned_in' => $linkable->referencesTo(
                'corner.activity',
                $model->id,
            ),
        ]);
    }

    public function store(StoreActivityRequest $request, AddActivity $action): RedirectResponse
    {
        $adder = $request->user();

        $action($request->validated(), $adder);

        return redirect('/apps/our-corner/activities');
    }

    public function update(UpdateActivityRequest $request, Activity $activity): RedirectResponse
    {
        return $this->updateItem($request, $activity);
    }

    public function toggleDone(Request $request, Activity $activity, ToggleListItemDone $action): RedirectResponse
    {
        return $this->toggleItemDone($request, $activity, $action);
    }

    public function destroy(Activity $activity): RedirectResponse
    {
        return $this->destroyItem($activity);
    }
}
