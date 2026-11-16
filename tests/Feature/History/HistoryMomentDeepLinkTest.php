<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class HistoryMomentDeepLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_timeline_includes_a_requested_moment_beyond_the_first_page(): void
    {
        $user = User::factory()->create();
        $oldest = Event::factory()->create(['occurred_on' => '2001-01-01', 'title' => 'First home', 'creator_id' => $user->id]);
        Event::factory()->count(25)->create(['occurred_on' => '2024-05-05', 'creator_id' => $user->id]);

        $response = $this->actingAs($user)->get("/apps/our-history?moment={$oldest->id}");

        $response->assertOk();
        $this->assertNotContains($oldest->id, array_column($response->inertiaProps('events.data'), 'id'));
        $this->assertSame($oldest->id, $response->inertiaProps('moment.id'));
        $this->assertSame('First home', $response->inertiaProps('moment.title'));
        $this->assertTrue($response->inertiaProps('moment.can.update'));
    }

    public function test_another_member_sees_the_moment_but_cannot_manage_it(): void
    {
        $owner = User::factory()->create();
        $viewer = User::factory()->create();
        $event = Event::factory()->create(['creator_id' => $owner->id]);

        $response = $this->actingAs($viewer)->get("/apps/our-history?moment={$event->id}");

        $this->assertSame($event->id, $response->inertiaProps('moment.id'));
        $this->assertFalse($response->inertiaProps('moment.can.update'));
        $this->assertFalse($response->inertiaProps('moment.can.delete'));
    }

    public function test_unknown_deleted_or_malformed_ids_open_nothing(): void
    {
        $user = User::factory()->create();
        $deleted = Event::factory()->create(['creator_id' => $user->id]);
        $deleted->delete();

        foreach (['999999', (string) $deleted->id, 'abc', '-3', '1.5'] as $id) {
            $this->actingAs($user)->get("/apps/our-history?moment={$id}")
                ->assertOk()
                ->assertInertia(fn ($page) => $page->where('moment', null));
        }

        $this->actingAs($user)->get('/apps/our-history')
            ->assertInertia(fn ($page) => $page->where('moment', null));
    }

    public function test_calendar_includes_a_requested_moment_from_another_year(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create(['occurred_on' => '2010-03-04', 'creator_id' => $user->id]);
        Event::factory()->create(['occurred_on' => '2024-03-04', 'creator_id' => $user->id]);

        $response = $this->actingAs($user)->get("/apps/our-history/calendar?year=2024&moment={$event->id}");

        $this->assertSame($event->id, $response->inertiaProps('moment.id'));
    }

    public function test_new_moment_push_links_to_the_moment(): void
    {
        Notification::fake();
        $actor = User::factory()->create();
        $recipient = User::factory()->create();

        $this->actingAs($actor)->post(route('apps.our-history.events.store'), [
            'occurred_on' => '2024-06-01',
            'title' => 'Beach day',
        ]);

        $event = Event::query()->where('title', 'Beach day')->sole();

        Notification::assertSentTo(
            $recipient,
            GenericPushNotification::class,
            fn (GenericPushNotification $notification) => $notification->toWebPush($recipient, $notification)->toArray()['data']['url']
                === "/apps/our-history?moment={$event->id}",
        );
    }
}
