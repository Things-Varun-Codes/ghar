<?php

namespace Tests\Feature\Admin;

use App\Shell\Models\Invitation;
use App\Shell\Models\ShortLink;
use App\Shell\Models\User;
use App\Shell\Services\Rooms;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class NonAdminCannotAccessAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    /**
     * The `can:admin` on the route group is the only admin check, so every admin route is
     * walked here: one added outside the group, or a group that loses it, fails this test.
     */
    public function test_every_admin_route_refuses_a_regular_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $invite = Invitation::factory()->create([
            'invited_by_user_id' => $other->id,
        ]);
        $parameters = [
            'user' => $other->id,
            'invite' => $invite->id,
            'shortlink' => ShortLink::factory()->create()->id,
            'room' => app(Rooms::class)->installed()[0]['slug'],
        ];

        $routes = collect(Route::getRoutes()->getRoutes())
            ->filter(fn (RoutingRoute $route): bool => str_starts_with((string) $route->getName(), 'admin.'));

        $this->assertNotEmpty($routes);

        foreach ($routes as $route) {
            $this->assertContains('can:admin', $route->gatherMiddleware(), "{$route->getName()} lacks can:admin");

            $method = collect($route->methods())->reject(fn (string $m): bool => $m === 'HEAD')->first();
            $url = route($route->getName(), array_intersect_key($parameters, array_flip($route->parameterNames())));

            $this->actingAs($user)
                ->call($method, $url)
                ->assertForbidden();
        }
    }

    public function test_regular_user_cannot_access_admin_users(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.users.index'))->assertForbidden();
    }

    public function test_regular_user_cannot_access_admin_invites(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('admin.invites.index'))->assertForbidden();
    }

    public function test_regular_user_cannot_post_invite(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('admin.invites.store'), ['email' => 'x@x.com', 'role' => 'user'])
            ->assertForbidden();

        $this->assertDatabaseCount('invitations', 0);
    }

    public function test_regular_user_cannot_patch_user_role(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('admin.users.update', ['user' => $other->id]), ['role' => 'admin'])
            ->assertForbidden();
    }

    public function test_regular_user_cannot_delete_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->actingAs($user)
            ->delete(route('admin.users.destroy', ['user' => $other->id]))
            ->assertForbidden();
    }
}
