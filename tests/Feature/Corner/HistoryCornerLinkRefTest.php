<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\History\Actions\CreateEvent;
use App\MiniApps\History\Actions\DeleteEvent;
use App\MiniApps\History\Actions\UpdateEvent;
use App\MiniApps\History\Http\Requests\StoreEventRequest;
use App\MiniApps\History\Http\Requests\UpdateEventRequest;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

class HistoryCornerLinkRefTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private ?CornerList $songsList = null;

    private function song(array $attributes = []): Item
    {
        $this->songsList ??= $this->songs();

        return $this->itemIn($this->songsList, User::factory()->create(), $attributes);
    }

    private function pillFor(Item $item): string
    {
        return $this->pill('corner.item', $item->id, $item->title, "/apps/our-shelf/songs/{$item->id}");
    }

    /** A pill written before lists were customisable: the old type and the old id. */
    private function legacyPill(Item $item): string
    {
        return $this->pill((string) $item->legacy_type, (int) $item->legacy_id, $item->title, "/apps/our-shelf/songs/{$item->legacy_id}");
    }

    private function pill(string $type, int $id, string $title, string $href): string
    {
        return '<span data-corner-type="'.$type.'" data-corner-id="'.$id.'"'
            .' data-corner-title="'.e($title).'"'
            .' data-corner-thumbnail=""'
            .' data-corner-href="'.$href.'">'.e($title).'</span>';
    }

    private function createEventViaAction(User $actor, ?string $bodyHtml): Event
    {
        $payload = [
            'occurred_on' => '2026-06-15',
            'title' => 'Test event',
            'body_html' => $bodyHtml,
        ];

        $request = StoreEventRequest::create('/apps/our-history', 'POST', $payload);
        $request->setContainer($this->app);
        $request->setRedirector($this->app['redirect']);
        $request->validateResolved();

        $action = $this->app->make(CreateEvent::class);

        return $action($request, $actor);
    }

    private function updateEventViaAction(Event $event, User $actor, ?string $bodyHtml): Event
    {
        $payload = [
            'occurred_on' => $event->occurred_on->format('Y-m-d'),
            'title' => $event->title,
            'body_html' => $bodyHtml,
        ];

        $request = UpdateEventRequest::create('/apps/our-history/events/'.$event->id, 'PATCH', $payload);
        // authorize() asks EventPolicy about the routed {event} for the acting user.
        $route = (new Route('PATCH', 'apps/our-history/events/{event}', []))->bind($request);
        $route->setParameter('event', $event);
        $request->setUserResolver(fn () => $actor);
        $request->setRouteResolver(fn () => $route);
        $request->setContainer($this->app);
        $request->setRedirector($this->app['redirect']);
        $request->validateResolved();

        $action = $this->app->make(UpdateEvent::class);

        return $action($event, $request, $actor);
    }

    public function test_add_inserts_ref(): void
    {
        $actor = User::factory()->create();
        $song = $this->song();

        $body = '<p>We loved this: '.$this->pillFor($song).'</p>';

        $event = $this->createEventViaAction($actor, $body);

        $this->assertDatabaseHas('entity_references', [
            'from_type' => 'history.event',
            'from_id' => $event->id,
            'to_type' => 'corner.item',
            'to_id' => $song->id,
        ]);
    }

    public function test_remove_deletes_ref(): void
    {
        $actor = User::factory()->create();
        $song = $this->song();

        $event = $this->createEventViaAction(
            $actor,
            '<p>'.$this->pillFor($song).'</p>',
        );

        $this->assertDatabaseHas('entity_references', [
            'from_type' => 'history.event',
            'from_id' => $event->id,
            'to_type' => 'corner.item',
            'to_id' => $song->id,
        ]);

        $this->updateEventViaAction($event, $actor, '<p>Just a story now.</p>');

        $this->assertDatabaseMissing('entity_references', [
            'from_type' => 'history.event',
            'from_id' => $event->id,
            'to_type' => 'corner.item',
            'to_id' => $song->id,
        ]);
    }

    public function test_diff_handles_swap(): void
    {
        $actor = User::factory()->create();
        $songA = $this->song();
        $songB = $this->song();

        $event = $this->createEventViaAction(
            $actor,
            '<p>'.$this->pillFor($songA).'</p>',
        );

        // Swap: remove A, add B.
        $this->updateEventViaAction(
            $event,
            $actor,
            '<p>'.$this->pillFor($songB).'</p>',
        );

        $this->assertDatabaseMissing('entity_references', [
            'from_type' => 'history.event',
            'from_id' => $event->id,
            'to_type' => 'corner.item',
            'to_id' => $songA->id,
        ]);

        $this->assertDatabaseHas('entity_references', [
            'from_type' => 'history.event',
            'from_id' => $event->id,
            'to_type' => 'corner.item',
            'to_id' => $songB->id,
        ]);
    }

    public function test_delete_event_prunes_all_refs(): void
    {
        $actor = User::factory()->create();
        $songA = $this->song();
        $songB = $this->song();
        $songC = $this->song();

        $event = $this->createEventViaAction(
            $actor,
            '<p>'.$this->pillFor($songA).' '.$this->pillFor($songB).' '.$this->pillFor($songC).'</p>',
        );

        $this->assertDatabaseCount('entity_references', 3);

        $this->app->make(DeleteEvent::class)($event, $actor);

        $this->assertDatabaseMissing('entity_references', [
            'from_type' => 'history.event',
            'from_id' => $event->id,
        ]);
    }

    public function test_create_event_with_no_corner_links_writes_no_refs(): void
    {
        $actor = User::factory()->create();

        $event = $this->createEventViaAction($actor, '<p>Plain text only.</p>');

        $this->assertDatabaseCount('entity_references', 0);
        $this->assertNotNull($event->id);
    }

    public function test_an_old_style_pill_keeps_its_reference_when_the_moment_is_saved_again(): void
    {
        $actor = User::factory()->create();
        $old = $this->song(['legacy_type' => 'corner.song', 'legacy_id' => 4]);
        $new = $this->song();

        $event = $this->createEventViaAction($actor, '<p>'.$this->legacyPill($old).'</p>');

        $this->assertDatabaseHas('entity_references', [
            'from_type' => 'history.event', 'from_id' => $event->id, 'to_type' => 'corner.song', 'to_id' => 4,
        ]);

        // Saving again with a new pill beside it keeps the old one as it was written.
        $this->updateEventViaAction($event, $actor, '<p>'.$this->legacyPill($old).' '.$this->pillFor($new).'</p>');

        $this->assertDatabaseHas('entity_references', [
            'from_type' => 'history.event', 'from_id' => $event->id, 'to_type' => 'corner.song', 'to_id' => 4,
        ]);
        $this->assertDatabaseHas('entity_references', [
            'from_type' => 'history.event', 'from_id' => $event->id, 'to_type' => 'corner.item', 'to_id' => $new->id,
        ]);
        $this->assertDatabaseCount('entity_references', 2);
        $this->assertStringContainsString('data-corner-type="corner.song"', (string) $event->fresh()->body_html);
    }

    public function test_every_old_type_is_kept_and_an_unknown_type_is_dropped(): void
    {
        $actor = User::factory()->create();
        $body = '<p>'
            .$this->pill('corner.song', 1, 'A song', '/apps/our-shelf/songs/1')
            .$this->pill('corner.movie', 2, 'A movie', '/apps/our-shelf/movies/2')
            .$this->pill('corner.activity', 3, 'An activity', '/apps/our-shelf/activities/3')
            .$this->pill('corner.place', 4, 'A place', '/apps/our-shelf/places/4')
            .$this->pill('corner.book', 5, 'Not a type', '/apps/our-shelf/books/5')
            .'</p>';

        $event = $this->createEventViaAction($actor, $body);

        $this->assertSame(
            ['corner.activity:3', 'corner.movie:2', 'corner.place:4', 'corner.song:1'],
            DB::table('entity_references')->where('from_id', $event->id)->orderBy('to_type')
                ->get()->map(fn ($r) => "{$r->to_type}:{$r->to_id}")->all(),
        );
    }
}
