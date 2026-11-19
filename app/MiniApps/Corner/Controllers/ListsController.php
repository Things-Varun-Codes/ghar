<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Actions\CreateList;
use App\MiniApps\Corner\Actions\MoveList;
use App\MiniApps\Corner\Http\Requests\SaveListRequest;
use App\MiniApps\Corner\Models\CornerList;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ListsController
{
    public function store(SaveListRequest $request, CreateList $action): RedirectResponse
    {
        $list = $action($request->validated(), $request->user());

        FlashToast::success("Made {$list->name}.");

        return redirect()->route('apps.our-shelf.lists.show', $list->slug);
    }

    public function update(SaveListRequest $request, CornerList $list): RedirectResponse
    {
        $list->update($request->validated());

        FlashToast::success('Saved.');

        return redirect()->back();
    }

    public function move(Request $request, CornerList $list, MoveList $action): RedirectResponse
    {
        Gate::authorize('reorder', CornerList::class);

        $validated = $request->validate(['direction' => ['required', Rule::in(['up', 'down'])]]);

        $action($list, $validated['direction']);

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
