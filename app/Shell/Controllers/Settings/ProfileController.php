<?php

namespace App\Shell\Controllers\Settings;

use App\Shell\Notifications\VerifyChangedEmailNotification;
use App\Shell\Support\Birthday;
use App\Shell\Support\FlashToast;
use App\Shell\Support\Person;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController
{
    public function show(Request $request): Response
    {
        return Inertia::render('Shell/Pages/Settings/Profile', [
            'user' => [
                ...Person::of($request->user()),
                'email' => $request->user()->email,
                'birthday' => $request->user()->birthday?->toDateString(),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'birthday' => Birthday::rules($user),
        ], Birthday::messages());

        $user->forceFill([
            'name' => $validated['name'],
            'birthday' => $validated['birthday'] ?? null,
        ])->save();

        if ($validated['email'] !== $user->email) {
            $verifyUrl = URL::temporarySignedRoute(
                'settings.email.verify',
                now()->addHour(),
                [
                    'user' => $user->id,
                    'email' => $validated['email'],
                ]
            );

            $user->notify(new VerifyChangedEmailNotification($validated['email'], $verifyUrl));

            return redirect()->route('settings.profile.show')
                ->with('status', 'profile-updated-email-pending');
        }

        FlashToast::success('Saved.');

        return redirect()->route('settings.profile.show');
    }
}
