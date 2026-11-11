<?php

namespace App\Shell\Console\Commands;

use App\Shell\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateAdminCommand extends Command
{
    protected $signature = 'ghar:create-admin
                            {email : Email address for the admin account}
                            {name  : Display name for the admin account}
                            {--password= : Plain-text password (generated if omitted)}
                            {--if-none : Do nothing, successfully, when an admin already exists}';

    protected $description = 'Bootstrap the Ghar admin account (idempotent)';

    public function handle(): int
    {
        if (User::role('admin')->exists()) {
            if ($this->option('if-none')) {
                return self::SUCCESS;
            }

            $this->error('An admin account already exists. Aborting.');

            return self::FAILURE;
        }

        $email = (string) $this->argument('email');
        $name = (string) $this->argument('name');
        $password = (string) ($this->option('password') ?? '');

        $generated = false;

        if ($password === '') {
            $password = Str::password(24);
            $generated = true;
        }

        $user = new User;
        $user->name = $name;
        $user->email = $email;
        $user->forceFill([
            'password' => Hash::make($password),
            'email_verified_at' => now(),
        ])->save();

        $user->assignRole('admin');

        $this->info("Admin account created: {$email}");

        if ($generated) {
            $this->line("Generated password: {$password}");
            $this->warn('Save this password now — it cannot be recovered.');
        }

        return self::SUCCESS;
    }
}
