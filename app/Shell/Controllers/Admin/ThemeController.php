<?php

namespace App\Shell\Controllers\Admin;

use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ThemeController
{
    public function index(): Response
    {
        Gate::authorize('admin');

        return Inertia::render('Shell/Pages/Admin/ThemeIndex', []);
    }

    public function update(Request $request): RedirectResponse
    {
        Gate::authorize('admin');

        $validated = $request->validate(
            [
                'theme' => [
                    'required',
                    'string',
                    Rule::in(array_column(config('themes.themes', []), 'slug')),
                ],
            ],
            [
                'theme.in' => 'Theme not found. Please refresh and try again.',
            ],
        );

        DB::table('settings')->updateOrInsert(
            ['key' => 'active_theme'],
            ['value' => $validated['theme'], 'updated_at' => now()],
        );

        FlashToast::success('Theme updated to '.$validated['theme'].'.');

        return redirect()->route('admin.theme.index');
    }
}
