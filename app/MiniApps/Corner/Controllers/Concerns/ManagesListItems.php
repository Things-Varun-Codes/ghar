<?php

namespace App\MiniApps\Corner\Controllers\Concerns;

use App\MiniApps\Corner\Actions\ToggleListItemDone;
use App\MiniApps\Corner\Concerns\ListItemContract;
use App\Shell\Support\ResolvesListSort;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Shared handlers for the Corner list controllers. Each controller keeps thin public actions
 * typed to its own model, because route-model binding can't resolve the intersection type
 * these take.
 */
trait ManagesListItems
{
    use ResolvesListSort;

    /** @return array<string, array<int, array{0: string, 1: 'asc'|'desc'}>> */
    protected function sortOptions(): array
    {
        return [
            'recent' => [['added_at', 'desc'], ['id', 'desc']],
            'title' => [['title', 'asc'], ['id', 'asc']],
        ];
    }

    protected function updateItem(FormRequest $request, ListItemContract&Model $item): RedirectResponse
    {
        Gate::authorize('update', $item);

        $item->update($request->validated());

        return redirect()->back();
    }

    protected function destroyItem(ListItemContract&Model $item): RedirectResponse
    {
        Gate::authorize('delete', $item);

        $item->delete();

        return redirect()->back();
    }

    protected function toggleItemDone(Request $request, ListItemContract&Model $item, ToggleListItemDone $action): RedirectResponse
    {
        Gate::authorize('toggleDone', $item);

        $action($item, $request->user());

        return redirect()->back();
    }
}
