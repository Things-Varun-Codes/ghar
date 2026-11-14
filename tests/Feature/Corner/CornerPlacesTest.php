<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Place;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CornerPlacesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_add_place(): void
    {
        Notification::fake();

        $adder = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);

        $this->actingAs($adder)
            ->post('/apps/our-corner/places', [
                'title' => 'Sydney Opera House',
                'place_id' => 'ChIJ3S-JXmauEmsRUcIaWtf4MzE',
                'lat' => -33.8568,
                'lng' => 151.2153,
                'address' => 'Bennelong Point, Sydney NSW 2000',
            ])
            ->assertRedirect('/apps/our-corner/places');

        $this->assertDatabaseHas('corner_places', [
            'title' => 'Sydney Opera House',
            'place_id' => 'ChIJ3S-JXmauEmsRUcIaWtf4MzE',
            'address' => 'Bennelong Point, Sydney NSW 2000',
            'added_by_user_id' => $adder->id,
        ]);

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $n) use ($recipient) {
                $webPush = $n->toWebPush($recipient, $n)->toArray();

                return ($webPush['tag'] ?? null) === 'our-corner:places'
                    && str_contains($webPush['body'] ?? '', 'added a place: Sydney Opera House');
            }
        );
    }

    public function test_a_place_can_be_typed_in_without_google(): void
    {
        Notification::fake();

        $adder = User::factory()->create();

        $this->actingAs($adder)
            ->post('/apps/our-corner/places', [
                'title' => 'The bakery on 4th Cross',
                'place_id' => '',
                'address' => '',
            ])
            ->assertRedirect('/apps/our-corner/places');

        $place = Place::query()->sole();
        $this->assertNull($place->place_id);
        $this->assertNull($place->lat);
        $this->assertNull($place->address);

        $this->actingAs($adder)
            ->get("/apps/our-corner/places/{$place->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('place.lat', null)->where('place.address', null));
    }

    public function test_a_place_needs_a_name_and_both_coordinates_or_none(): void
    {
        $adder = User::factory()->create();

        $this->actingAs($adder)
            ->from('/apps/our-corner/places')
            ->post('/apps/our-corner/places', ['title' => '', 'lat' => 12.34])
            ->assertSessionHasErrors(['title', 'lng']);

        $this->assertSame(0, Place::count());
    }

    public function test_lat_lng_decimal_precision(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        User::factory()->create();

        $this->actingAs($adder)
            ->post('/apps/our-corner/places', [
                'title' => 'Precision Probe',
                'place_id' => 'ChIJprecision',
                'lat' => 12.3456789,
                'lng' => -98.7654321,
                'address' => 'A precise spot',
            ])
            ->assertRedirect();

        $place = Place::first();
        $this->assertNotNull($place);

        $this->assertEqualsWithDelta(12.3456789, (float) $place->lat, 0.00000005);
        $this->assertEqualsWithDelta(-98.7654321, (float) $place->lng, 0.00000005);
    }

    public function test_owner_can_update_place(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        User::factory()->create();
        $place = Place::factory()->create([
            'added_by_user_id' => $adder->id,
            'title' => 'Old Cafe',
        ]);

        $this->actingAs($adder)
            ->patch("/apps/our-corner/places/{$place->id}", [
                'title' => 'New Cafe',
                'place_id' => 'ChIJnewplaceid',
                'lat' => 40.7484,
                'lng' => -73.9857,
                'address' => '20 W 34th St, New York, NY 10001',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('corner_places', [
            'id' => $place->id,
            'title' => 'New Cafe',
            'place_id' => 'ChIJnewplaceid',
            'address' => '20 W 34th St, New York, NY 10001',
        ]);

        // Edit is silent — no push on update.
        Notification::assertNothingSent();
    }
}
