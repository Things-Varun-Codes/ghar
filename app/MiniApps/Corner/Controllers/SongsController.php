<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Actions\AddSong;
use App\MiniApps\Corner\Actions\ToggleListItemDone;
use App\MiniApps\Corner\Actions\UpdateSongLink;
use App\MiniApps\Corner\Controllers\Concerns\ManagesListItems;
use App\MiniApps\Corner\Http\Requests\StoreSongRequest;
use App\MiniApps\Corner\Http\Requests\UpdateSongRequest;
use App\MiniApps\Corner\Http\Resources\SongResource;
use App\MiniApps\Corner\Models\Song;
use App\Shell\Services\LinkableEntities;
use App\Shell\Support\CursorList;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SongsController
{
    use ManagesListItems;

    /** @return array<string, array<int, array{0: string, 1: 'asc'|'desc'}>> */
    protected function sortOptions(): array
    {
        return [
            'recent' => [['added_at', 'desc'], ['id', 'desc']],
            'title' => [['title', 'asc'], ['id', 'asc']],
            'artist' => [['author', 'asc'], ['id', 'asc']],
        ];
    }

    public function index(Request $request): Response
    {
        $base = Song::query()
            ->with('addedBy');

        $filter = in_array($request->query('filter'), ['active', 'done'], true)
            ? $request->query('filter')
            : 'all';

        $sort = $this->resolveSort($request);
        $q = trim((string) $request->query('q')) ?: null;

        $this->applyListOrder($base, $sort);

        return Inertia::render('MiniApps/Corner/Pages/Songs/Index', [
            'songs' => CursorList::make($base)
                ->status('done_at')
                ->searchable(['title', 'author'], $q)
                ->paginate($filter, 50, fn (Song $s) => app(SongResource::class)($s)),
            'filter' => $filter,
            'sort' => $sort,
            'q' => $q,
        ]);
    }

    public function show(string $song, LinkableEntities $linkable): Response
    {
        $model = Song::find($song);
        if ($model === null) {
            return Inertia::render('MiniApps/Corner/Pages/EntityNotFound', ['kind' => 'song']);
        }

        return Inertia::render('MiniApps/Corner/Pages/Songs/Show', [
            'song' => app(SongResource::class)($model),
            'mentioned_in' => $linkable->referencesTo('corner.song', $model->id),
        ]);
    }

    public function store(StoreSongRequest $request, AddSong $action): RedirectResponse
    {
        $adder = $request->user();

        $action($request->validated('url'), $adder);

        return redirect('/apps/our-corner/songs');
    }

    public function update(UpdateSongRequest $request, Song $song, UpdateSongLink $action): RedirectResponse
    {
        Gate::authorize('update', $song);

        $action($song, $request->validated('url'));

        return redirect()->back();
    }

    public function toggleDone(Request $request, Song $song, ToggleListItemDone $action): RedirectResponse
    {
        return $this->toggleItemDone($request, $song, $action);
    }

    public function destroy(Song $song): RedirectResponse
    {
        return $this->destroyItem($song);
    }
}
