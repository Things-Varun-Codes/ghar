<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Actions\CreateList;
use App\MiniApps\Corner\Actions\SwitchDoneMode;
use App\MiniApps\Corner\Http\Requests\SaveListRequest;
use App\MiniApps\Corner\Models\CornerList;
use App\Shell\Support\FlashToast;
use App\Shell\Support\PersonalOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ListsController
{
    public function store(SaveListRequest $request, CreateList $action): RedirectResponse
    {
        $list = $action($request->validated(), $request->user());

        FlashToast::success("Made {$list->name}.");

        return redirect()->route('apps.our-shelf.lists.show', $list->slug);
    }

    public function update(SaveListRequest $request, CornerList $list, SwitchDoneMode $switchDoneMode): RedirectResponse
    {
        $validated = $request->validated();

        if (array_key_exists('done_per_person', $validated)) {
            $switchDoneMode($list, (bool) $validated['done_per_person']);
            unset($validated['done_per_person']);
        }

        $list->update($validated);

        FlashToast::success('Saved.');

        return redirect()->back();
    }

    public function order(Request $request): RedirectResponse
    {
        Gate::authorize('reorder', CornerList::class);

        $validated = $request->validate([
            'ids' => ['required', 'array', 'max:1000'],
            'ids.*' => ['required', 'integer', 'distinct'],
        ]);

        PersonalOrder::save(CornerList::query(), $request->user(), CornerList::ORDER_SCOPE, array_map(intval(...), $validated['ids']));

        return redirect()->back();
    }

    public function destroy(CornerList $list): RedirectResponse
    {
        Gate::authorize('delete', $list);

        $list->delete();

        FlashToast::success("Deleted {$list->name}.");

        return redirect()->route('apps.our-shelf.landing');
    }
}
