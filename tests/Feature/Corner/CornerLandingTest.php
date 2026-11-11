<?php

namespace Tests\Feature\Corner;

use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CornerLandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_renders_lists_grid(): void
    {
        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/apps/our-corner');

        $response->assertOk();
        $response->assertInertia(
            fn ($page) => $page
                ->component('MiniApps/Corner/Pages/Landing')
                ->has('cornerSummary.counts.songs')
                ->has('cornerSummary.counts.movies')
                ->has('cornerSummary.counts.activities')
                ->has('cornerSummary.counts.places')
                ->missing('cornerSummary.counts.messages')
                ->missing('cornerSummary.counts.challans'),
        );
    }
}
