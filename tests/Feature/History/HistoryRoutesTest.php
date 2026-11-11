<?php

namespace Tests\Feature\History;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class HistoryRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_calendar_route_exists(): void
    {
        $this->assertTrue(
            Route::has('apps.our-history.calendar'),
            'apps.our-history.calendar must be registered (the calendar has shipped)',
        );

        /** @var User $user */
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/apps/our-history/calendar')
            ->assertStatus(200);
    }

    public function test_map_route_still_deferred(): void
    {
        $this->assertFalse(
            Route::has('apps.our-history.map'),
            'apps.our-history.map must NOT be registered (still deferred)',
        );

        /** @var User $user */
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/apps/our-history/map')
            ->assertStatus(404);
    }
}
