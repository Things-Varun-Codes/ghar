<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Actions\AddItem;
use App\MiniApps\History\Models\Event;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;
use App\Shell\Services\Rooms;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

/** With Our Corner turned off, nothing of it shows anywhere, and nothing of it is lost. */
class CornerRoomOffTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private function turnCornerOff(): void
    {
        app(Rooms::class)->set('our-corner', false);
    }

    public function test_its_pages_home_door_and_picker_are_gone(): void
    {
        $user = User::factory()->create();
        $songs = $this->songs();
        $item = $this->itemIn($songs, $user, ['title' => 'Rain on the Tin Roof']);
        $this->turnCornerOff();

        $this->actingAs($user)->get('/apps/our-corner')->assertNotFound();
        $this->get("/apps/our-corner/songs/{$item->id}")->assertNotFound();
        $this->get('/api/linkable/search?q=rain')->assertNotFound();

        $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page
            ->where('miniApps', fn ($apps) => collect($apps)->pluck('slug')->doesntContain('our-corner'))
            ->where('summaries', fn ($s) => ! collect($s)->has('our-corner'))
            ->where('previews', fn ($p) => ! collect($p)->has('our-corner'))
        );

        $this->assertSame([], app(LinkableEntities::class)->search('rain'));
    }

    public function test_an_add_that_outlives_the_switch_sends_no_push(): void
    {
        Notification::fake();
        $adder = User::factory()->create();
        User::factory()->create();
        $list = $this->activities();
        $this->turnCornerOff();

        app(AddItem::class)($list, ['title' => 'Board game night'], $adder);

        Notification::assertNothingSent();
    }

    public function test_history_keeps_old_and_new_pills_when_a_moment_is_saved_while_it_is_off(): void
    {
        $user = User::factory()->create();
        $songs = $this->songs();
        $old = $this->itemIn($songs, $user, ['legacy_type' => 'corner.song', 'legacy_id' => 3]);
        $new = $this->itemIn($songs, $user);

        $body = '<p>'.$this->pill('corner.song', 3, $old->title, '/apps/our-corner/songs/3')
            .' and '.$this->pill('corner.item', $new->id, $new->title, "/apps/our-corner/songs/{$new->id}").'</p>';

        $this->actingAs($user)->post('/apps/our-history/events', [
            'occurred_on' => '2026-06-15',
            'title' => 'A night in',
            'body_html' => $body,
        ])->assertSessionHasNoErrors();
        $event = Event::query()->sole();

        $this->turnCornerOff();

        $this->patch("/apps/our-history/events/{$event->id}", [
            'occurred_on' => '2026-06-15',
            'title' => 'A quiet night in',
            'body_html' => $body,
        ])->assertSessionHasNoErrors();

        $refs = fn (): array => DB::table('entity_references')
            ->where('from_type', 'history.event')
            ->where('from_id', $event->id)
            ->orderBy('to_type')
            ->get(['to_type', 'to_id'])
            ->map(fn ($r): string => "{$r->to_type}:{$r->to_id}")
            ->all();

        $this->assertSame(['corner.item:'.$new->id, 'corner.song:3'], $refs());
        $this->assertStringContainsString('data-corner-type="corner.song"', (string) $event->refresh()->body_html);
        $this->assertStringContainsString('data-corner-type="corner.item"', (string) $event->body_html);

        app(Rooms::class)->set('our-corner', true);
        $this->get("/apps/our-corner/songs/{$new->id}")->assertOk()->assertInertia(fn ($page) => $page
            ->where('mentioned_in.0.from_id', $event->id));
    }

    private function pill(string $type, int $id, string $title, string $href): string
    {
        return '<span data-corner-type="'.$type.'" data-corner-id="'.$id.'"'
            .' data-corner-title="'.e($title).'" data-corner-thumbnail=""'
            .' data-corner-href="'.$href.'">'.e($title).'</span>';
    }
}
