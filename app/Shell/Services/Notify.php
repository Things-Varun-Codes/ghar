<?php

namespace App\Shell\Services;

use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Notifications\Notification;

class Notify
{
    /**
     * $channels applies only to array payloads; a Notification instance's via() decides for
     * itself.
     *
     * @param  list<'push'|'email'>  $channels
     */
    public function send(User $user, array|Notification $payload, array $channels = ['push']): void
    {
        if (is_array($payload)) {
            $payload = new GenericPushNotification($payload, $channels);
        }

        $user->notify($payload);
    }
}
