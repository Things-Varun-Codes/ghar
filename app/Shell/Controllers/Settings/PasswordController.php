<?php

namespace App\Shell\Controllers\Settings;

use App\Concerns\PasswordValidationRules;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
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

        // A reset link sent before the change would otherwise still work.
        Password::broker()->deleteToken($request->user());
        // Keeps this device's "keep me signed in" cookie, which carries the old password's hash.
        Auth::logoutOtherDevices($validated['password']);

        FlashToast::success('Password updated.');

        return redirect()->route('settings.password.show');
    }
}
