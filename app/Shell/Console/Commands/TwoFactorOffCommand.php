<?php

namespace App\Shell\Console\Commands;

use App\Shell\Models\User;
use Illuminate\Console\Command;
use Laravel\Fortify\Actions\DisableTwoFactorAuthentication;

/** The way back in for someone who lost both their authenticator and their recovery codes. */
class TwoFactorOffCommand extends Command
{
    protected $signature = 'ghar:two-factor-off {email : Email address of the account}';

    protected $description = 'Turn off two-step sign-in for one account';

    public function handle(DisableTwoFactorAuthentication $disable): int
    {
        $user = User::where('email', mb_strtolower((string) $this->argument('email')))->first();

        if ($user === null) {
            $this->error('No account has that email address.');

            return self::FAILURE;
        }

        $disable($user);

        $this->info("Two-step sign-in is off for {$user->email}. They sign in with their password alone.");

        return self::SUCCESS;
    }
}
