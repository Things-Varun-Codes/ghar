<?php

namespace App\Shell\Controllers\Admin;

use App\Shell\Services\Rooms;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RoomsController
{
    public function index(Rooms $rooms): Response
    {
        Gate::authorize('admin');

        return Inertia::render('Shell/Pages/Admin/Rooms', [
            'rooms' => $rooms->forAdmin(),
        ]);
    }

    public function update(Request $request, Rooms $rooms, string $room): RedirectResponse
    {
        Gate::authorize('admin');

        abort_unless($rooms->has($room), 404);

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'option' => ['sometimes', 'required', 'string'],
        ]);

        $on = (bool) $validated['enabled'];
        $entry = collect($rooms->forAdmin())->firstWhere('slug', $room);

        if (isset($validated['option'])) {
            $option = collect($entry['options'])->firstWhere('key', $validated['option']);
            abort_if($option === null, 404);

            $rooms->setOption($room, $option['key'], $on);
            $label = $option['label'];
        } else {
            $rooms->set($room, $on);
            $label = $entry['name'];
        }

        FlashToast::success($on ? "{$label} is on." : "{$label} is off. Nothing in it was deleted.");

        return redirect()->route('admin.rooms.index');
    }
}
