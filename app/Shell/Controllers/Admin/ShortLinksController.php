<?php

namespace App\Shell\Controllers\Admin;

use App\Shell\Models\ShortLink;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ShortLinksController
{
    public function index(): Response
    {
        Gate::authorize('admin');

        $shortlinks = ShortLink::with('creator')
            ->latest()
            ->get()
            ->map(fn (ShortLink $shortlink) => [
                'id' => $shortlink->id,
                'label' => $shortlink->label,
                'code' => $shortlink->code,
                'url' => route('go', ['code' => $shortlink->code]),
                'destination' => $shortlink->destination,
                'enabled' => $shortlink->enabled,
                'created_at' => $shortlink->created_at,
            ]);

        return Inertia::render('Shell/Pages/Admin/ShortLinks', [
            'shortlinks' => $shortlinks,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('admin');

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:80'],
            // The url:http,https rule is the security boundary: it blocks javascript: and
            // data: destinations.
            'destination' => ['required', 'string', 'max:2048', 'url:http,https'],
        ]);

        $shortlink = new ShortLink($validated);
        $shortlink->code = ShortLink::generateCode();
        $shortlink->created_by = $request->user()->id;
        $shortlink->save();

        FlashToast::success('Shortlink created.');

        return redirect()->route('admin.shortlinks.index');
    }

    public function update(Request $request, ShortLink $shortlink): RedirectResponse
    {
        Gate::authorize('admin');

        $validated = $request->validate([
            'label' => ['sometimes', 'required', 'string', 'max:80'],
            'destination' => ['sometimes', 'required', 'string', 'max:2048', 'url:http,https'],
            'enabled' => ['sometimes', 'required', 'boolean'],
        ]);

        if ($validated === []) {
            // A body with none of the recognised keys is a misspelled client field; fail
            // rather than drop it silently.
            throw ValidationException::withMessages(['label' => 'Nothing to update.']);
        }

        $shortlink->update($validated);

        $isRepoint = array_key_exists('label', $validated) || array_key_exists('destination', $validated);

        FlashToast::success(
            $isRepoint
                ? 'Shortlink updated.'
                : ($validated['enabled'] ? 'Shortlink enabled.' : 'Shortlink disabled.')
        );

        return redirect()->route('admin.shortlinks.index');
    }

    public function destroy(ShortLink $shortlink): RedirectResponse
    {
        Gate::authorize('admin');

        $shortlink->delete();

        FlashToast::success('Shortlink deleted.');

        return redirect()->route('admin.shortlinks.index');
    }
}
