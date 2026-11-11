<?php

namespace App\Shell\Console\Commands;

use App\Shell\Models\User;
use App\Shell\Notifications\TestNotification;
use Illuminate\Console\Command;

class NotifyTestCommand extends Command
{
    protected $signature = 'notify:test {user-id : Target user id}';

    protected $description = 'Send a real test push + email to the given user.';

    public function handle(): int
    {
        $userId = $this->argument('user-id');

        $user = User::find($userId);

        if (! $user) {
            $this->error('User not found.');

            return self::FAILURE;
        }

        $subscriptionCount = $user->pushSubscriptions()->count();

        $user->notify(new TestNotification);

        $this->info(
            "Sent test push to {$subscriptionCount} device(s) and test email to {$user->email}. ".
            "If push doesn't arrive within 10s on iOS PWA, confirm subscription is active in /settings/notifications."
        );

        return self::SUCCESS;
    }
}
