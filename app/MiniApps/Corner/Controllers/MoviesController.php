<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Actions\AddMovie;
use App\MiniApps\Corner\Actions\ToggleListItemDone;
use App\MiniApps\Corner\Controllers\Concerns\ManagesListItems;
use App\MiniApps\Corner\Http\Requests\StoreMovieRequest;
use App\MiniApps\Corner\Http\Requests\UpdateMovieRequest;
use App\MiniApps\Corner\Http\Resources\MovieResource;
use App\MiniApps\Corner\Models\Movie;
use App\MiniApps\Corner\Services\MoviePosterResolver;
use App\Shell\Services\LinkableEntities;
use App\Shell\Support\CursorList;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MoviesController
{
    use ManagesListItems;

    public function index(Request $request): Response
    {
        $base = Movie::query()
            ->with('addedBy');

        $filter = in_array($request->query('filter'), ['active', 'done'], true)
            ? $request->query('filter')
            : 'all';

        $sort = $this->resolveSort($request);
        $q = trim((string) $request->query('q')) ?: null;

        $this->applyListOrder($base, $sort);

        return Inertia::render('MiniApps/Corner/Pages/Movies/Index', [
            'movies' => CursorList::make($base)
                ->status('done_at')
                ->searchable(['title'], $q)
                ->paginate($filter, 50, fn (Movie $m) => app(MovieResource::class)($m)),
            'filter' => $filter,
            'sort' => $sort,
            'q' => $q,
        ]);
    }

    public function show(string $movie, LinkableEntities $linkable): Response
    {
        $model = Movie::find($movie);
        if ($model === null) {
            return Inertia::render('MiniApps/Corner/Pages/EntityNotFound', ['kind' => 'movie']);
        }

        return Inertia::render('MiniApps/Corner/Pages/Movies/Show', [
            'movie' => app(MovieResource::class)($model),
            'mentioned_in' => $linkable->referencesTo('corner.movie', $model->id),
        ]);
    }

    public function store(StoreMovieRequest $request, AddMovie $action): RedirectResponse
    {
        $adder = $request->user();

        $action($request->validated(), $adder);

        return redirect('/apps/our-corner/movies');
    }

    public function update(UpdateMovieRequest $request, Movie $movie, MoviePosterResolver $resolver): RedirectResponse
    {
        Gate::authorize('update', $movie);

        $validated = $request->validated();

        $posterUrl = $resolver($validated['plex_url'] ?? null);

        $movie->update([
            'title' => $validated['title'],
            'plex_url' => $validated['plex_url'] ?? null,
            'poster_url' => $posterUrl,
        ]);

        return redirect()->back();
    }

    public function toggleDone(Request $request, Movie $movie, ToggleListItemDone $action): RedirectResponse
    {
        return $this->toggleItemDone($request, $movie, $action);
    }

    public function destroy(Movie $movie): RedirectResponse
    {
        return $this->destroyItem($movie);
    }
}
