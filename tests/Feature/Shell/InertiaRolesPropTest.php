<?php

namespace Tests\Feature\Shell;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InertiaRolesPropTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RoleSeeder::class);
    }

    public function test_unauthenticated_request_has_null_auth_user(): void
    {
        $response = $this->get(route('login'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $this->assertNull($page['props']['auth']['user']);
    }

    public function test_authenticated_non_admin_has_empty_roles_array(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $authUser = $page['props']['auth']['user'];

        $this->assertIsArray($authUser['roles']);
        $this->assertEmpty($authUser['roles']);
    }

    public function test_authenticated_admin_has_admin_in_roles_array(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $response = $this->actingAs($admin)->get(route('dashboard'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $authUser = $page['props']['auth']['user'];

        $this->assertIsArray($authUser['roles']);
        $this->assertContains('admin', $authUser['roles']);
    }

    public function test_is_admin_key_is_not_in_auth_user_props(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $authUser = $page['props']['auth']['user'];

        $this->assertArrayNotHasKey('is_admin', $authUser);
    }
}
