<?php

namespace Tests\Feature\Shell;

use App\Shell\Models\User;
use App\Shell\Services\DashboardSummaries;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class DashboardSummariesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_a_throwing_resolver_is_omitted_and_dashboard_still_renders(): void
    {
        Config::set('miniapps', [$this->fakeApp('boom', true)]);
        app(DashboardSummaries::class)->registerFeed('boom', function (): array {
            throw new \RuntimeException('resolver exploded');
        });

        $this->actingAs(User::factory()->create())->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($p) => $p->where('feed', []));
    }

    public function test_a_disabled_app_is_never_resolved(): void
    {
        Config::set('miniapps', [$this->fakeApp('sleepy', false)]);
        $called = false;
        app(DashboardSummaries::class)->registerFeed('sleepy', function () use (&$called): array {
            $called = true;

            return [];
        });

        $this->actingAs(User::factory()->create())->get('/dashboard')->assertOk();

        $this->assertFalse($called, 'a disabled registry entry must never have its resolver invoked');
    }

    /** @return array<string, mixed> */
    private function fakeApp(string $slug, bool $enabled): array
    {
        return [
            'name' => ucfirst($slug),
            'slug' => $slug,
            'route' => "/apps/{$slug}",
            'icon' => 'map',
            'description' => 'Fixture',
            'enabled' => $enabled,
            'admin_only' => false,
        ];
    }
}
