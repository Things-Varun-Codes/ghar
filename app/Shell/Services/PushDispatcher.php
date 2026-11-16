<?php

namespace App\Shell\Services;

use App\Shell\Models\User;

class PushDispatcher
{
    public function __construct(
        private readonly Notify $notify,
        private readonly Household $household,
        private readonly Rooms $rooms,
    ) {}

    public function toHousehold(User $actor, string $app, string $tag, string $body, string $url): void
    {
        $this->toUsers($this->household->othersThan($actor), $app, $tag, $body, $url);
    }

    /** @param  iterable<User>  $recipients */
    public function toUsers(iterable $recipients, string $app, string $tag, string $body, string $url): void
    {
        // A queued or scheduled sender can outlive the admin turning its room off.
        if ($this->rooms->has($app) && ! $this->rooms->isOn($app)) {
            return;
        }

        foreach ($recipients as $recipient) {
            $this->notify->send($recipient, [
                'app' => $app,
                'tag' => $tag,
                'body' => $body,
                'url' => $url,
            ], ['push']);
        }
    }
}
