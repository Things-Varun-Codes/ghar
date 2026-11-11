<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Seed the canonical roles for Ghar.
     *
     * Idempotent — safe to run on both a fresh DB and a live DB.
     * Roles are 'admin' and 'user' on the 'web' guard.
     */
    public function run(): void
    {
        Role::findOrCreate('admin', 'web');
        Role::findOrCreate('user', 'web');
    }
}
