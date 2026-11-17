<?php

namespace App\Shell\Controllers\Admin;

use App\Shell\Services\Rooms;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoomsController
{
    public function index(Rooms $rooms): Response
    {
        return Inertia::render('Shell/Pages/Admin/Rooms', [
            'rooms' => $rooms->forAdmin(),
        ]);
    }

    public function update(Request $request, Rooms $rooms, string $room): RedirectResponse
    {
        abort_unless($rooms->has($room), 404);

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'option' => ['sometimes', 'required', 'string'],
        ]);

        $on = (bool) $validated['enabled'];

        if (isset($validated['option'])) {
            $option = $validated['option'];
            abort_unless($rooms->hasOption($room, $option), 404);

            $rooms->setOption($room, $option, $on);
            $label = $rooms->optionLabel($room, $option);
        } else {
            $rooms->set($room, $on);
            $label = $rooms->name($room);
        }

        FlashToast::success($on ? "{$label} is on." : "{$label} is off. Nothing in it was deleted.");

        return redirect()->route('admin.rooms.index');
    }
}
