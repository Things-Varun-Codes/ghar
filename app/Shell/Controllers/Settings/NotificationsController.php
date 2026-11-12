<?php

namespace App\Shell\Controllers\Settings;

use App\Shell\Support\FlashToast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationsController
{
    public function show(Request $request): Response
    {
        return Inertia::render('Shell/Pages/Settings/Notifications', [
            'subscriptions' => $request->user()->pushSubscriptions()->pluck('endpoint'),
        ]);
    }

    public function subscribe(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|url|max:1024',
            'p256dh' => 'required|string',
            'auth' => 'required|string',
            'content_encoding' => 'nullable|string|in:aesgcm,aes128gcm',
        ]);

        $request->user()->updatePushSubscription(
            $validated['endpoint'],
            $validated['p256dh'],
            $validated['auth'],
            $validated['content_encoding'] ?? 'aesgcm',
        );

        FlashToast::success('This device is now subscribed.');

        return redirect()->route('settings.notifications.show');
    }

    public function unsubscribe(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|url|max:1024',
        ]);

        $request->user()->deletePushSubscription($validated['endpoint']);

        FlashToast::success('This device is unsubscribed.');

        return redirect()->route('settings.notifications.show');
    }
}
