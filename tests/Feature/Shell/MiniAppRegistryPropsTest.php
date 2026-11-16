<?php

namespace Tests\Feature\Shell;

use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class MiniAppRegistryPropsTest extends TestCase
{
    use RefreshDatabase;

    private array $fixtureRegistry;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);

        $this->fixtureRegistry = [
            [
                'name' => 'Treasure Hunt',
                'slug' => 'treasure-hunt',
                'route' => 'treasure-hunt.index',
                'description' => 'The proposal treasure hunt',
                'enabled' => true,
                'admin_only' => false,
            ],
            [
                'name' => 'Admin Tool',
                'slug' => 'admin-tool',
                'route' => 'admin-tool.index',
                'description' => 'Admin-only tool',
                'enabled' => true,
                'admin_only' => true,
            ],
            [
                'name' => 'Coming Soon',
                'slug' => 'coming-soon',
                'route' => 'coming-soon.index',
                'description' => 'Not ready',
                'enabled' => false,
                'admin_only' => false,
            ],
        ];
    }

    public function test_non_admin_users_get_enabled_public_mini_apps_only(): void
    {
        Config::set('miniapps', $this->fixtureRegistry);

        $user = User::factory()->create();
        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $miniApps = $page['props']['miniApps'] ?? null;

        $this->assertIsArray($miniApps);

        $slugs = array_column($miniApps, 'slug');
        $this->assertContains('treasure-hunt', $slugs, 'Enabled public mini-app must be in miniApps props');
        $this->assertNotContains('admin-tool', $slugs, 'admin_only mini-apps must NOT reach non-admin users');
        $this->assertNotContains('coming-soon', $slugs, 'Disabled mini-apps must never appear');
    }

    public function test_admin_users_also_get_admin_only_mini_apps_but_never_disabled_ones(): void
    {
        Config::set('miniapps', $this->fixtureRegistry);

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $response = $this->actingAs($admin)->get(route('dashboard'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $miniApps = $page['props']['miniApps'] ?? [];

        $slugs = array_column($miniApps, 'slug');
        $this->assertContains(
            'admin-tool',
            $slugs,
            'admin_only mini-apps MUST be in miniApps props for admin users'
        );
        $this->assertNotContains('coming-soon', $slugs, 'Disabled mini-apps must never appear, even for admins');
    }

    public function test_every_registry_entry_declares_what_the_shell_relies_on(): void
    {
        foreach (config('miniapps', []) as $app) {
            foreach (['name', 'slug', 'route', 'provider', 'component_prefix'] as $key) {
                $this->assertNotEmpty($app[$key] ?? null, "{$app['slug']} must declare {$key}");
            }

            $this->assertTrue(class_exists($app['provider']), "{$app['slug']} provider must exist");
        }
    }

    public function test_the_bottom_bar_gets_a_short_label_and_an_icon_module_for_each_room(): void
    {
        $this->assertNotEmpty(config('miniapps'));

        $user = User::factory()->create();
        $page = json_decode(json_encode($this->actingAs($user)->get(route('dashboard'))->viewData('page')), true);

        foreach ($page['props']['miniApps'] as $app) {
            $this->assertNotEmpty($app['nav_label'] ?? null, "{$app['slug']} needs a nav_label for the bottom bar");
            $this->assertNotEmpty($app['component_prefix'] ?? null, "{$app['slug']} needs a component_prefix");
            $this->assertFileExists(
                resource_path("js/{$app['component_prefix']}nav-icon.tsx"),
                "{$app['slug']} needs a nav-icon.tsx for the bottom bar",
            );
        }
    }
}
