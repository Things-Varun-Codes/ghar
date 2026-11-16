<?php

namespace App\Shell\Controllers\Settings;

use App\Shell\Models\User;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationController
{
    public function verify(Request $request): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            return redirect()->route('settings.profile.show')
                ->withErrors(['email' => 'This link is invalid or has expired. Change your email again to get a new one.']);
        }

        $userId = (int) $request->query('user');
        $newEmail = (string) $request->query('email');

        if ($request->user()?->id !== $userId) {
            return redirect()->route('settings.profile.show')
                ->withErrors(['email' => 'This link was made for a different account. Sign in to that account and open it again.']);
        }

        $user = User::findOrFail($userId);

        // Someone else may have claimed the address during the link's one-hour window.
        if (User::where('email', $newEmail)->where('id', '!=', $userId)->exists()) {
            return redirect()->route('settings.profile.show')
                ->withErrors(['email' => 'Another account already uses this email address. Choose a different one.']);
        }

        $user->forceFill(['email' => $newEmail])->save();

        FlashToast::success('Email updated.');

        return redirect()->route('settings.profile.show');
    }
}
