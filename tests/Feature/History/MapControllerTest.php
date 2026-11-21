<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class MapControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_sends_each_located_moment_with_only_what_a_marker_needs(): void
    {
        $user = User::factory()->create();
        $lake = Event::factory()->create([
            'creator_id' => $user->id,
            'occurred_on' => '2024-06-04',
            'title' => 'Sunday at the lake',
            'location_name' => 'Ulsoor Lake',
            'location_address' => 'Ulsoor, Bengaluru',
            'location_lat' => 12.983,
            'location_lng' => 77.619,
            'location_freetext' => null,
            'body_html' => '<p>Private story</p>',
        ]);

        $this->actingAs($user)
            ->get('/apps/our-history/map')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('MiniApps/History/Pages/Map')
                ->has('points', 1)
                ->where('points.0', [
                    'id' => $lake->id,
                    'date_label' => '4 Jun 2024',
                    'title' => 'Sunday at the lake',
                    'location_name' => 'Ulsoor Lake',
                    'location_address' => 'Ulsoor, Bengaluru',
                    'location_freetext' => null,
                    'lat' => 12.983,
                    'lng' => 77.619,
                ])
                ->where('unplacedCount', 0)
            );
    }

    public function test_moments_without_coordinates_are_counted_only_when_they_name_a_place(): void
    {
        $user = User::factory()->create();
        Event::factory()->create(['creator_id' => $user->id, 'location_freetext' => 'Home']);
        Event::factory()->create(['creator_id' => $user->id, 'location_name' => "Grandma's house", 'location_freetext' => null]);
        Event::factory()->create(['creator_id' => $user->id, 'location_name' => null, 'location_freetext' => null]);
        $deleted = Event::factory()->create(['creator_id' => $user->id, 'location_lat' => 1, 'location_lng' => 2]);
        $deleted->delete();

        $this->actingAs($user)
            ->get('/apps/our-history/map')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('points', 0)
                ->where('unplacedCount', 2)
            );
    }

    public function test_a_requested_moment_comes_whole_for_the_sheet(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create(['creator_id' => $user->id, 'location_lat' => 12.9, 'location_lng' => 77.6]);

        $response = $this->actingAs($user)->get("/apps/our-history/map?moment={$event->id}");

        $this->assertSame($event->id, $response->inertiaProps('moment.id'));
        $this->assertArrayHasKey('comments', $response->inertiaProps('moment'));
    }

    public function test_guests_are_sent_to_sign_in(): void
    {
        $this->get('/apps/our-history/map')->assertRedirect('/login');
    }
}
