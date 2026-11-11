<?php

namespace App\Shell\Controllers;

use App\Concerns\PasswordValidationRules;
use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class InvitationAcceptController
{
    use PasswordValidationRules;

    public function show(string $token): Response|RedirectResponse
    {
        $invitation = $this->findUsableInvitation($token);

        if (! $invitation) {
            return redirect()->route('login')
                ->withErrors(['token' => "This invite link doesn't work anymore. It may have expired, been used, or been revoked. Ask whoever invited you to send a new one."]);
        }

        return Inertia::render('Shell/Pages/Auth/InviteAccept', [
            'email' => $invitation->email,
            'token' => $token,
        ]);
    }

    public function store(Request $request, string $token): RedirectResponse
    {
        if (! $this->findUsableInvitation($token)) {
            return redirect()->route('login')
                ->withErrors(['token' => "This invite link doesn't work anymore. It may have expired, been used, or been revoked. Ask whoever invited you to send a new one."]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'password' => $this->passwordRules(),
        ]);

        $tokenHash = hash('sha256', $token);

        $newUser = null;
        $error = null;

        DB::transaction(function () use ($tokenHash, $validated, &$newUser, &$error) {
            // Re-fetch under a row lock so two concurrent requests can't both create a user.
            $invitation = Invitation::pending()
                ->where('token_hash', $tokenHash)
                ->lockForUpdate()
                ->first();

            if (! $invitation) {
                $error = ['token' => "This invite link doesn't work anymore. It may have expired, been used, or been revoked. Ask whoever invited you to send a new one."];

                return;
            }

            // Inside the lock so the check and insert are atomic.
            if (User::where('email', $invitation->email)->exists()) {
                $error = ['email' => "There's already an account with this email. Try signing in instead."];

                return;
            }

            // forceFill: email_verified_at isn't mass-assignable. Accepting the emailed invite
            // proves ownership of the address.
            $newUser = new User([
                'name' => $validated['name'],
                'email' => $invitation->email,
                'password' => Hash::make($validated['password']),
            ]);
            $newUser->forceFill(['email_verified_at' => now()])->save();

            $newUser->assignRole($invitation->role_name);

            $invitation->accepted_at = now();
            $invitation->save();
        });

        if ($error) {
            return redirect()->route('login')->withErrors($error);
        }

        Auth::login($newUser);

        return redirect()->route('dashboard');
    }

    private function findUsableInvitation(string $token): ?Invitation
    {
        return Invitation::pending()
            ->where('token_hash', hash('sha256', $token))
            ->first();
    }
}
