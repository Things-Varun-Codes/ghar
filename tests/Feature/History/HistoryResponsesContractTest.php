<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventComment;
use App\MiniApps\History\Models\EventReaction;
use App\Shell\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The shape reactions, comments and birthdays reach the page in, and the routes the sheet
 * calls. What the routes do is tested where it is built.
 */
class HistoryResponsesContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_moment_carries_its_people_reactions_and_comments(): void
    {
        $creator = User::factory()->create(['name' => 'Ravi Rao']);
        $meera = User::factory()->create(['name' => 'Meera Rao', 'birthday' => '1992-11-19']);
        $kabir = User::factory()->create(['name' => 'Kabir Rao']);
        $event = Event::factory()->birthdayOf($meera)->create(['creator_id' => $creator->id]);

        EventReaction::factory()->create(['event_id' => $event->id, 'user_id' => $meera->id, 'reaction' => 'heart']);
        EventReaction::factory()->create(['event_id' => $event->id, 'user_id' => $kabir->id, 'reaction' => 'heart']);
        EventReaction::factory()->create(['event_id' => $event->id, 'user_id' => $kabir->id, 'reaction' => 'party']);
        $mine = EventComment::factory()->create(['event_id' => $event->id, 'author_id' => $meera->id, 'body' => "First\nline"]);
        EventComment::factory()->create(['event_id' => $event->id, 'author_id' => $kabir->id]);

        $moment = $this->actingAs($meera)
            ->get("/apps/our-history?moment={$event->id}")
            ->assertOk()
            ->inertiaProps('moment');

        $this->assertSame(['id' => $creator->id, 'name' => 'Ravi', 'avatar_url' => null], $moment['creator']);
        $this->assertSame($meera->id, $moment['birthday_of']['id']);

        $this->assertSame(array_keys(EventReaction::EMOJI), array_column($moment['reactions'], 'key'));
        $this->assertSame(array_values(EventReaction::EMOJI), array_column($moment['reactions'], 'emoji'));
        $heart = $moment['reactions'][0];
        $this->assertSame(2, $heart['count']);
        $this->assertTrue($heart['mine']);
        $this->assertSame([$meera->id, $kabir->id], array_column($heart['people'], 'id'));
        $this->assertSame(['id', 'name', 'avatar_url'], array_keys($heart['people'][0]));
        $party = $moment['reactions'][5];
        $this->assertSame(['key' => 'party', 'emoji' => '🎉', 'count' => 1, 'mine' => false], array_diff_key($party, ['people' => 1]));
        $this->assertSame(0, $moment['reactions'][1]['count']);

        $this->assertCount(2, $moment['comments']);
        $this->assertSame(['id', 'body', 'author', 'created_at', 'can'], array_keys($moment['comments'][0]));
        $this->assertSame($mine->id, $moment['comments'][0]['id']);
        $this->assertSame("First\nline", $moment['comments'][0]['body']);
        $this->assertSame($meera->id, $moment['comments'][0]['author']['id']);
        $this->assertTrue($moment['comments'][0]['can']['delete']);
        $this->assertFalse($moment['comments'][1]['can']['delete']);
    }

    public function test_a_departed_author_or_creator_is_null(): void
    {
        $viewer = User::factory()->create();
        $gone = User::factory()->create();
        $event = Event::factory()->create(['creator_id' => $gone->id]);
        EventComment::factory()->create(['event_id' => $event->id, 'author_id' => $gone->id]);
        EventReaction::factory()->create(['event_id' => $event->id, 'user_id' => $gone->id, 'reaction' => 'sad']);
        $gone->delete();

        $moment = $this->actingAs($viewer)->get("/apps/our-history?moment={$event->id}")->inertiaProps('moment');

        $this->assertNull($moment['creator']);
        $this->assertNull($moment['comments'][0]['author']);
        $this->assertSame(0, $moment['reactions'][3]['count']);
    }

    public function test_timeline_and_calendar_send_the_new_props(): void
    {
        $viewer = User::factory()->create(['birthday' => '1990-07-02']);
        User::factory()->create();
        Event::factory()->create(['creator_id' => $viewer->id]);

        $timeline = $this->actingAs($viewer)->get('/apps/our-history')->assertOk();
        $this->assertIsArray($timeline->inertiaProps('onThisDay'));
        $this->assertSame(
            [['person' => ['id' => $viewer->id, 'name' => $viewer->name, 'avatar_url' => null], 'month' => 7, 'day' => 2]],
            $timeline->inertiaProps('birthdays'),
        );
        $this->assertArrayHasKey('reactions', $timeline->inertiaProps('events.data.0'));
        $this->assertArrayHasKey('comments', $timeline->inertiaProps('events.data.0'));

        $calendar = $this->actingAs($viewer)->get('/apps/our-history/calendar')->assertOk();
        $this->assertCount(1, $calendar->inertiaProps('birthdays'));
        $this->assertArrayHasKey('creator', $calendar->inertiaProps('events.0'));
    }

    public function test_a_sheet_mutation_comes_back_to_the_open_moment_with_only_the_moment(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create(['creator_id' => $user->id]);
        $sheetUrl = "/apps/our-history?moment={$event->id}";
        $version = $this->actingAs($user)->get($sheetUrl)->viewData('page')['version'];
        $partial = [
            'X-Inertia' => 'true',
            'X-Inertia-Version' => (string) $version,
            'X-Inertia-Partial-Component' => 'MiniApps/History/Pages/Timeline',
            'X-Inertia-Partial-Data' => 'moment',
            'Referer' => url($sheetUrl),
        ];

        $this->withHeaders($partial)
            ->put("/apps/our-history/events/{$event->id}/reactions/heart")
            ->assertStatus(303)
            ->assertRedirect(url($sheetUrl));

        $page = $this->withHeaders($partial)->get($sheetUrl)->assertOk()->json();

        $this->assertSame($sheetUrl, $page['url']);
        $this->assertSame(['errors', 'moment'], array_keys($page['props']));
        $this->assertSame($event->id, $page['props']['moment']['id']);
    }

    public function test_the_routes_take_only_the_set_and_a_comment_of_its_own_moment(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create(['creator_id' => $user->id]);
        $other = Event::factory()->create(['creator_id' => $user->id]);
        $comment = EventComment::factory()->create(['event_id' => $other->id, 'author_id' => $user->id]);

        $this->actingAs($user);

        foreach (EventReaction::keys() as $key) {
            $this->put(route('apps.our-history.events.reactions.update', [$event, $key]))->assertRedirect();
            $this->delete(route('apps.our-history.events.reactions.destroy', [$event, $key]))->assertRedirect();
        }
        $this->put("/apps/our-history/events/{$event->id}/reactions/thumbs")->assertNotFound();
        $this->put("/apps/our-history/events/{$event->id}/reactions/".rawurlencode('❤️'))->assertNotFound();

        $this->delete(route('apps.our-history.events.comments.destroy', [$event, $comment]))->assertNotFound();
        $this->delete(route('apps.our-history.events.comments.destroy', [$other, $comment]))->assertRedirect();

        foreach (['', '   ', null, str_repeat('a', EventComment::MAX_LENGTH + 1)] as $body) {
            $this->post(route('apps.our-history.events.comments.store', $event), ['body' => $body])
                ->assertSessionHasErrors('body');
        }
        $this->post(route('apps.our-history.events.comments.store', $event), ['body' => 'Lovely'])
            ->assertSessionHasNoErrors()
            ->assertRedirect();
    }

    public function test_one_reaction_per_person_per_emoji_and_force_delete_takes_them_along(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create(['creator_id' => $user->id]);
        EventReaction::factory()->create(['event_id' => $event->id, 'user_id' => $user->id, 'reaction' => 'wow']);
        EventComment::factory()->create(['event_id' => $event->id, 'author_id' => $user->id]);

        try {
            DB::transaction(fn () => EventReaction::factory()->create(['event_id' => $event->id, 'user_id' => $user->id, 'reaction' => 'wow']));
            $this->fail('A second identical reaction was stored.');
        } catch (QueryException) {
            // The unique index refused it.
        }

        $event->forceDelete();

        $this->assertSame(0, EventReaction::query()->count());
        $this->assertSame(0, EventComment::query()->count());
    }
}
