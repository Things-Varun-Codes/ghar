<?php

namespace App\Shell\Controllers\Admin;

use App\Enums\UserRole;
use App\Shell\Actions\InviteUser;
use App\Shell\Models\Invitation;
use App\Shell\Models\User;
use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InvitesController
{
    public function index(): Response
    {
        Gate::authorize('admin');

        $invites = Invitation::with('invitedBy')
            ->orderByDesc('created_at')
            ->paginate(25)
            ->through(fn (Invitation $invite): array => [
                'id' => $invite->id,
                'email' => $invite->email,
                'role_name' => $invite->role_name,
                'expires_at' => $invite->expires_at,
                'accepted_at' => $invite->accepted_at,
                'revoked_at' => $invite->revoked_at,
                'created_at' => $invite->created_at,
                'invited_by' => $invite->invitedBy === null ? null : [
                    'id' => $invite->invitedBy->id,
                    'name' => $invite->invitedBy->name,
                ],
            ]);

        return Inertia::render('Shell/Pages/Admin/InvitesIndex', [
            'invites' => $invites,
        ]);
    }

    public function store(Request $request, InviteUser $inviteUser): RedirectResponse
    {
        Gate::authorize('admin');

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', 'string', Rule::in(array_column(UserRole::cases(), 'value'))],
        ]);

        $inviteUser(
            inviter: $request->user(),
            email: $validated['email'],
            roleName: $validated['role'],
        );

        FlashToast::success('Invitation sent to '.$validated['email'].'.');

        return redirect()->route('admin.invites.index');
    }

    public function resend(Request $request, Invitation $invite, InviteUser $inviteUser): RedirectResponse
    {
        Gate::authorize('admin');

        // One transaction so a failure can't leave the old token revoked with no replacement;
        // the row lock stops a double click from sending two.
        $refusal = DB::transaction(function () use ($request, $invite, $inviteUser): ?string {
            $locked = Invitation::query()->pending()->whereKey($invite->id)->lockForUpdate()->first();

            if ($locked === null) {
                return 'This invitation is no longer pending.';
            }

            if (User::query()->where('email', $locked->email)->exists()) {
                return 'That email address already has an account.';
            }

            $locked->revoked_at = now();
            $locked->save();

            $inviteUser(
                inviter: $request->user(),
                email: $locked->email,
                roleName: $locked->role_name,
            );

            return null;
        });

        if ($refusal !== null) {
            FlashToast::error($refusal);

            return redirect()->route('admin.invites.index');
        }

        FlashToast::success('Invitation resent to '.$invite->email.'.');

        return redirect()->route('admin.invites.index');
    }

    public function destroy(Invitation $invite): RedirectResponse
    {
        Gate::authorize('admin');

        $invite->revoked_at = now();
        $invite->save();

        FlashToast::success('Invitation revoked.');

        return redirect()->route('admin.invites.index');
    }
}
