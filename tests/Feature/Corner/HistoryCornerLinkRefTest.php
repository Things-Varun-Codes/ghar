<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\Song;
use App\MiniApps\History\Actions\CreateEvent;
use App\MiniApps\History\Actions\DeleteEvent;
use App\MiniApps\History\Actions\UpdateEvent;
use App\MiniApps\History\Http\Requests\StoreEventRequest;
use App\MiniApps\History\Http\Requests\UpdateEventRequest;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route;
use Tests\TestCase;

class HistoryCornerLinkRefTest extends TestCase
{
    use RefreshDatabase;

    private function pillFor(Song $song): string
    {
        $href = '/apps/our-corner/songs/'.$song->id;

        return '<span data-corner-type="corner.song" data-corner-id="'.$song->id.'"'
            .' data-corner-title="'.e($song->title).'"'
            .' data-corner-thumbnail=""'
            .' data-corner-href="'.$href.'">'.e($song->title).'</span>';
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
        $song = Song::factory()->create();

        $body = '<p>We loved this: '.$this->pillFor($song).'</p>';

        $event = $this->createEventViaAction($actor, $body);

        $this->assertDatabaseHas('entity_references', [
            'from_type' => 'history.event',
            'from_id' => $event->id,
            'to_type' => 'corner.song',
            'to_id' => $song->id,
        ]);
    }

    public function test_remove_deletes_ref(): void
    {
        $actor = User::factory()->create();
        $song = Song::factory()->create();

        $event = $this->createEventViaAction(
            $actor,
            '<p>'.$this->pillFor($song).'</p>',
        );

        $this->assertDatabaseHas('entity_references', [
            'from_type' => 'history.event',
            'from_id' => $event->id,
            'to_type' => 'corner.song',
            'to_id' => $song->id,
        ]);

        $this->updateEventViaAction($event, $actor, '<p>Just a story now.</p>');

        $this->assertDatabaseMissing('entity_references', [
            'from_type' => 'history.event',
            'from_id' => $event->id,
            'to_type' => 'corner.song',
            'to_id' => $song->id,
        ]);
    }

    public function test_diff_handles_swap(): void
    {
        $actor = User::factory()->create();
        $songA = Song::factory()->create();
        $songB = Song::factory()->create();

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
            'to_type' => 'corner.song',
            'to_id' => $songA->id,
        ]);

        $this->assertDatabaseHas('entity_references', [
            'from_type' => 'history.event',
            'from_id' => $event->id,
            'to_type' => 'corner.song',
            'to_id' => $songB->id,
        ]);
    }

    public function test_delete_event_prunes_all_refs(): void
    {
        $actor = User::factory()->create();
        $songA = Song::factory()->create();
        $songB = Song::factory()->create();
        $songC = Song::factory()->create();

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
}
