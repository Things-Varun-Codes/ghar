<?php

namespace App\Shell\Controllers\Admin;

use App\Enums\UserRole;
use App\Shell\Actions\ProfilePicture;
use App\Shell\Actions\RemoveMember;
use App\Shell\Http\Resources\UserResource;
use App\Shell\Models\User;
use App\Shell\Services\UserOwnedContent;
use App\Shell\Support\Birthday;
use App\Shell\Support\FlashToast;
use App\Shell\Support\Person;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UsersController
{
    public function index(): Response
    {
        $users = User::with('roles')
            ->orderByRaw('removed_at is not null')
            ->orderBy('name')
            ->paginate(25);

        return Inertia::render('Shell/Pages/Admin/UsersIndex', [
            'users' => UserResource::collection($users),
        ]);
    }

    public function edit(User $user): Response
    {
        $user->load('roles');

        return Inertia::render('Shell/Pages/Admin/UsersEdit', [
            'user' => [
                ...Person::of($user),
                'email' => $user->email,
                'birthday' => $user->birthday?->toDateString(),
                'roles' => $user->getRoleNames()->values()->all(),
            ],
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(array_column(UserRole::cases(), 'value'))],
            'birthday' => Birthday::rules($user),
        ], Birthday::messages());

        /** @var User $actor */
        $actor = auth()->user();

        $roleChanges = $user->getRoleNames()->values()->all() !== [$validated['role']];

        // BlockLastAdminDemotion only protects the last admin; this covers self-demotion when
        // there are others.
        if ($roleChanges && $actor->id === $user->id) {
            return redirect()->route('admin.users.index')
                ->withErrors(['role' => 'You cannot change your own role.']);
        }

        try {
            DB::transaction(function () use ($user, $validated, $roleChanges) {
                $user->forceFill(['birthday' => $validated['birthday'] ?? null])->save();

                if ($roleChanges) {
                    $user->syncRoles([$validated['role']]);
                }
            });
        } catch (AuthorizationException $e) {
            return redirect()->route('admin.users.index')
                ->withErrors(['role' => $e->getMessage()]);
        }

        FlashToast::success($roleChanges
            ? $user->name.'\'s role updated to '.$validated['role'].'.'
            : 'Saved.');

        return redirect()->route('admin.users.index');
    }

    /** An admin may take anyone's picture down, but only its owner can put one up. */
    public function destroyPicture(User $user, ProfilePicture $pictures): RedirectResponse
    {
        $pictures->remove($user);

        FlashToast::success($user->name.'\'s picture removed.');

        return redirect()->route('admin.users.edit', ['user' => $user->id]);
    }

    /**
     * Makes them a former member: they can't sign in and drop out of every picker, but what they
     * made stays under their name, and money owed to or by them can still be settled.
     */
    public function remove(User $user, RemoveMember $removeMember): RedirectResponse
    {
        /** @var User $actor */
        $actor = auth()->user();

        if ($actor->id === $user->id) {
            return redirect()->route('admin.users.index')
                ->withErrors(['remove' => 'You cannot remove yourself.']);
        }

        if ($user->isFormer()) {
            return redirect()->route('admin.users.index');
        }

        try {
            $removeMember($user);
        } catch (AuthorizationException $e) {
            return redirect()->route('admin.users.index')
                ->withErrors(['remove' => $e->getMessage()]);
        }

        FlashToast::success($user->name.' was removed from the household.');

        return redirect()->route('admin.users.index');
    }

    public function restore(User $user): RedirectResponse
    {
        if ($user->isFormer()) {
            DB::transaction(function () use ($user) {
                $user->forceFill(['removed_at' => null])->save();
                $user->syncRoles([UserRole::User->value]);
            });

            FlashToast::success($user->name.' is back in the household.');
        }

        return redirect()->route('admin.users.index');
    }

    /** Only for a former member who never left anything behind, such as an invite accepted by mistake. */
    public function destroy(User $user, UserOwnedContent $ownedContent): RedirectResponse
    {
        if (! $user->isFormer()) {
            return redirect()->route('admin.users.index')
                ->withErrors(['delete' => "Remove {$user->name} from the household first."]);
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
                ->withErrors(['delete' => "{$user->name} can't be deleted for good. They still have ".implode(', ', $parts).'. They stay a former member.']);
        }

        try {
            DB::transaction(fn () => $user->delete());
        } catch (QueryException) {
            // Something of theirs was saved between the check and the delete; a foreign key refused it.
            return redirect()->route('admin.users.index')
                ->withErrors(['delete' => "{$user->name} can't be deleted for good: something of theirs is still saved. They stay a former member."]);
        }

        FlashToast::success('User deleted.');

        return redirect()->route('admin.users.index');
    }
}
