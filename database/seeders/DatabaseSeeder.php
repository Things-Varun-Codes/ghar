<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\App;

class DatabaseSeeder extends Seeder
{
    /**
     * Roles everywhere; the sample household only in local and testing.
     *
     * Production gets its first account from `php artisan ghar:create-admin`.
     */
    public function run(): void
    {
        $this->call(RoleSeeder::class);

        if (App::environment(['local', 'testing'])) {
            $this->call(DevDataSeeder::class);
        }
    }
}
