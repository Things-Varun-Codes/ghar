<?php

namespace App\Shell\Controllers\Settings;

use App\Concerns\PasswordValidationRules;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController
{
    use PasswordValidationRules;

    public function show(): Response
    {
        return Inertia::render('Shell/Pages/Settings/Password');
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => $this->passwordRules(),
        ]);

        $request->user()->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        FlashToast::success('Password updated.');

        return redirect()->route('settings.password.show');
    }
}
