<?php

namespace App\Shell\Controllers\Admin;

use App\Shell\Models\User;
use App\Shell\Services\Notify;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class NotificationsController
{
    public function show(): Response
    {
        Gate::authorize('admin');

        return Inertia::render('Shell/Pages/Admin/NotificationsSend', [
            'users' => User::orderBy('name')->get(['id', 'name', 'email']),
        ]);
    }

    public function send(Request $request): RedirectResponse
    {
        Gate::authorize('admin');

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:500'],
            'url' => ['nullable', 'string', 'max:500'],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => [Rule::in(['push', 'email'])],
        ]);

        /** @var User $recipient */
        $recipient = User::findOrFail($validated['user_id']);

        // Before dispatch: queued delivery can prune expired subscriptions, which would
        // undercount.
        $hasPush = in_array('push', $validated['channels'], true);
        $pushCount = $hasPush
            ? $recipient->pushSubscriptions()->count()
            : 0;

        $payload = [
            'app' => 'shell',
            'title' => $validated['title'],
            'body' => $validated['body'],
            'url' => $validated['url'] ?: '/dashboard',
        ];

        app(Notify::class)->send($recipient, $payload, $validated['channels']);

        $hasEmail = in_array('email', $validated['channels'], true);

        if ($hasPush && $hasEmail) {
            $flash = "Sent push to {$pushCount} active device(s) for {$recipient->name} and email to {$recipient->name}.";
        } elseif ($hasPush) {
            $flash = "Sent push to {$pushCount} active device(s) for {$recipient->name}.";
        } else {
            $flash = "Sent email to {$recipient->name}.";
        }

        return redirect()->route('admin.notifications.show')
            ->with('success', $flash);
    }
}
