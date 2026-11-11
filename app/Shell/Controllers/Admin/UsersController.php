<?php

namespace App\Shell\Controllers\Admin;

use App\Enums\UserRole;
use App\Shell\Http\Resources\UserResource;
use App\Shell\Models\User;
use App\Shell\Services\UserOwnedContent;
use App\Shell\Support\FlashToast;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UsersController
{
    public function index(): Response
    {
        Gate::authorize('admin');

        $users = User::with('roles')
            ->orderBy('name')
            ->paginate(25);

        return Inertia::render('Shell/Pages/Admin/UsersIndex', [
            'users' => UserResource::collection($users),
        ]);
    }

    public function edit(User $user): Response
    {
        Gate::authorize('admin');

        $user->load('roles');

        return Inertia::render('Shell/Pages/Admin/UsersEdit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames()->values()->all(),
            ],
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('admin');

        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(array_column(UserRole::cases(), 'value'))],
        ]);

        /** @var User $actor */
        $actor = auth()->user();

        // BlockLastAdminDemotion only protects the last admin; this covers self-demotion when
        // there are others.
        if ($actor->id === $user->id) {
            return redirect()->route('admin.users.index')
                ->withErrors(['role' => 'You cannot change your own role.']);
        }

        try {
            DB::transaction(function () use ($user, $validated) {
                $user->syncRoles([$validated['role']]);
            });
        } catch (AuthorizationException $e) {
            return redirect()->route('admin.users.index')
                ->withErrors(['role' => $e->getMessage()]);
        }

        FlashToast::success($user->name.'\'s role updated to '.$validated['role'].'.');

        return redirect()->route('admin.users.index');
    }

    public function destroy(User $user, UserOwnedContent $ownedContent): RedirectResponse
    {
        Gate::authorize('admin');

        /** @var User $actor */
        $actor = auth()->user();

        if ($actor->id === $user->id) {
            return redirect()->route('admin.users.index')
                ->withErrors(['delete' => 'You cannot delete your own account.']);
        }

        // Before delete(): Spatie's deleting hook detaches the roles first, so hasRole() would
        // be false by the time the observer runs.
        if ($user->hasRole('admin') && User::role('admin')->count() <= 1) {
            return redirect()->route('admin.users.index')
                ->withErrors(['delete' => 'Cannot delete the last admin account.']);
        }

        // Checks both sides of every relationship: someone who only ever received mail still
        // blocks the delete.
        $contentSummary = $ownedContent->summaryFor($user);
        if ($contentSummary !== []) {
            $parts = [];
            foreach ($contentSummary as $label => $count) {
                $parts[] = "{$label} ({$count})";
            }

            return redirect()->route('admin.users.index')
                ->withErrors(['delete' => "Cannot delete {$user->name}: still linked to ".implode(', ', $parts).'.']);
        }

        try {
            DB::transaction(function () use ($user) {
                $user->delete();
            });
        } catch (AuthorizationException $e) {
            return redirect()->route('admin.users.index')
                ->withErrors(['delete' => $e->getMessage()]);
        }

        FlashToast::success('User deleted.');

        return redirect()->route('admin.users.index');
    }
}
