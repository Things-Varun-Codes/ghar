<?php

namespace Tests\Feature\Settings;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class SettingsListsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_anyone_signed_in_opens_settings(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('settings.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Shell/Pages/Settings/Index'));
    }

    public function test_an_admin_opens_admin_settings(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Shell/Pages/Admin/Index'));
    }

    public function test_settings_needs_a_sign_in(): void
    {
        $this->get(route('settings.index'))->assertRedirect(route('login'));
    }
}
