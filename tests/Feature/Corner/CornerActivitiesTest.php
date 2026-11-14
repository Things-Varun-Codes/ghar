<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Activity;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class CornerActivitiesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_add_activity(): void
    {
        Notification::fake();

        $adder = User::factory()->create(['name' => 'Alice Smith']);
        $recipient = User::factory()->create(['name' => 'Bob Jones']);

        $this->actingAs($adder)
            ->post('/apps/our-corner/activities', ['title' => 'Beach trip'])
            ->assertRedirect('/apps/our-corner/activities');

        $this->assertDatabaseHas('corner_activities', [
            'title' => 'Beach trip',
            'added_by_user_id' => $adder->id,
        ]);

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            function (GenericPushNotification $n) use ($recipient) {
                $webPush = $n->toWebPush($recipient, $n)->toArray();

                return ($webPush['tag'] ?? null) === 'our-corner:activities'
                    && str_contains($webPush['body'] ?? '', 'added an activity: Beach trip');
            }
        );
    }

    public function test_activity_with_notes(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        User::factory()->create();

        $this->actingAs($adder)
            ->post('/apps/our-corner/activities', [
                'title' => 'Hiking',
                'notes' => 'Bring water and snacks; start before sunrise.',
            ])
            ->assertRedirect('/apps/our-corner/activities');

        $this->assertDatabaseHas('corner_activities', [
            'title' => 'Hiking',
            'notes' => 'Bring water and snacks; start before sunrise.',
        ]);
    }

    public function test_title_required(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        User::factory()->create();

        $this->actingAs($adder)
            ->from('/apps/our-corner/activities')
            ->post('/apps/our-corner/activities', [])
            ->assertSessionHasErrors(['title']);

        $this->assertSame(0, Activity::count());
    }

    public function test_owner_can_update_activity(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        User::factory()->create();
        $activity = Activity::factory()->create([
            'added_by_user_id' => $adder->id,
            'title' => 'Old title',
            'notes' => 'old notes',
        ]);

        $this->actingAs($adder)
            ->patch("/apps/our-corner/activities/{$activity->id}", [
                'title' => 'New title',
                'notes' => 'new notes',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('corner_activities', [
            'id' => $activity->id,
            'title' => 'New title',
            'notes' => 'new notes',
        ]);

        // Edit is silent — no push on update.
        Notification::assertNothingSent();
    }

    public function test_update_activity_requires_title(): void
    {
        $adder = User::factory()->create();
        $activity = Activity::factory()->create(['added_by_user_id' => $adder->id]);

        $this->actingAs($adder)
            ->from('/apps/our-corner/activities')
            ->patch("/apps/our-corner/activities/{$activity->id}", ['title' => ''])
            ->assertSessionHasErrors(['title']);
    }

    public function test_push_on_add_can_be_muted_per_list(): void
    {
        Notification::fake();

        $adder = User::factory()->create();
        User::factory()->create();

        config(['corner-lists.activities.push_on_add' => false]);

        $this->actingAs($adder)
            ->post('/apps/our-corner/activities', ['title' => 'Muted Activity'])
            ->assertRedirect();

        $this->assertDatabaseHas('corner_activities', ['title' => 'Muted Activity']);
        Notification::assertNothingSent();
    }
}
