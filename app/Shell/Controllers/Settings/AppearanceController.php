<?php

namespace App\Shell\Controllers\Settings;

use App\Enums\Theme;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppearanceController
{
    // No toast: the screen changing colour says it worked.
    public function __invoke(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'theme' => ['required', Rule::enum(Theme::class)],
        ]);

        $request->user()->update(['theme' => $validated['theme']]);

        return redirect()->route('settings.appearance.show');
    }
}
