<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventChange;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HistoryBirthdayLinkTest extends TestCase
{
    use RefreshDatabase;

    private User $ravi;

    private User $meera;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ravi = User::factory()->create(['name' => 'Ravi Rao', 'birthday' => '1990-07-02']);
        $this->meera = User::factory()->create(['name' => 'Meera Rao', 'birthday' => '1992-06-14']);
    }

    public function test_a_moment_on_her_birthday_can_be_linked_to_it(): void
    {
        $this->actingAs($this->ravi)->post(route('apps.our-history.events.store'), [
            'occurred_on' => '2023-06-14',
            'title' => 'Picnic',
            'birthday_user_id' => $this->meera->id,
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertSame($this->meera->id, Event::query()->sole()->birthday_user_id);
    }

    public function test_a_moment_on_another_day_is_refused_in_the_rooms_words(): void
    {
        $this->actingAs($this->ravi)->post(route('apps.our-history.events.store'), [
            'occurred_on' => '2023-06-15',
            'birthday_user_id' => $this->meera->id,
        ])->assertSessionHasErrors(['birthday_user_id' => "That date isn't Meera's birthday."]);

        $this->assertSame(0, Event::query()->count());
    }

    public function test_a_member_without_a_birthday_or_an_unknown_one_is_refused(): void
    {
        $kabir = User::factory()->create(['name' => 'Kabir Rao']);

        $this->actingAs($this->ravi)->post(route('apps.our-history.events.store'), [
            'occurred_on' => '2023-06-14',
            'birthday_user_id' => $kabir->id,
        ])->assertSessionHasErrors(['birthday_user_id' => "That date isn't Kabir's birthday."]);

        $this->actingAs($this->ravi)->post(route('apps.our-history.events.store'), [
            'occurred_on' => '2023-06-14',
            'birthday_user_id' => 999999,
        ])->assertSessionHasErrors('birthday_user_id');
    }

    public function test_a_former_member_can_stay_on_a_moment_but_not_be_put_on_a_new_one(): void
    {
        $event = Event::factory()->create(['occurred_on' => '2023-06-14', 'creator_id' => $this->ravi->id, 'birthday_user_id' => $this->meera->id]);
        $this->meera->forceFill(['removed_at' => now()])->save();

        $this->actingAs($this->ravi)->patch(route('apps.our-history.events.update', $event), [
            'title' => 'Picnic by the lake',
            'birthday_user_id' => $this->meera->id,
        ])->assertSessionHasNoErrors();
        $this->assertSame($this->meera->id, $event->refresh()->birthday_user_id);

        $this->post(route('apps.our-history.events.store'), [
            'occurred_on' => '2024-06-14',
            'birthday_user_id' => $this->meera->id,
        ])->assertSessionHasErrors('birthday_user_id');
    }

    public function test_a_leap_day_birthday_links_to_feb_28_of_a_non_leap_year_only(): void
    {
        $tara = User::factory()->create(['name' => 'Tara Rao', 'birthday' => '2000-02-29']);

        $this->actingAs($this->ravi)->post(route('apps.our-history.events.store'), [
            'occurred_on' => '2023-02-28',
            'birthday_user_id' => $tara->id,
        ])->assertSessionHasNoErrors();

        $this->actingAs($this->ravi)->post(route('apps.our-history.events.store'), [
            'occurred_on' => '2024-02-28',
            'birthday_user_id' => $tara->id,
        ])->assertSessionHasErrors(['birthday_user_id' => "That date isn't Tara's birthday."]);
    }

    public function test_linking_on_an_edit_is_checked_against_the_date_it_keeps_and_logged_in_words(): void
    {
        $event = Event::factory()->create(['creator_id' => $this->ravi->id, 'occurred_on' => '2023-06-14']);

        $this->actingAs($this->ravi)->patch(route('apps.our-history.events.update', $event), [
            'birthday_user_id' => $this->ravi->id,
        ])->assertSessionHasErrors(['birthday_user_id' => "That date isn't Ravi's birthday."]);

        $this->actingAs($this->ravi)->patch(route('apps.our-history.events.update', $event), [
            'title' => 'Picnic',
            'birthday_user_id' => $this->meera->id,
        ])->assertSessionHasNoErrors();

        $this->assertSame($this->meera->id, $event->refresh()->birthday_user_id);
        $this->assertSame("Updated title and linked to Meera's birthday", $this->lastSummary($event));

        $this->actingAs($this->ravi)->patch(route('apps.our-history.events.update', $event), [
            'birthday_user_id' => null,
        ])->assertSessionHasNoErrors();

        $this->assertNull($event->refresh()->birthday_user_id);
        $this->assertSame("Unlinked from Meera's birthday", $this->lastSummary($event));
    }

    public function test_moving_a_linked_moment_off_the_birthday_drops_the_link(): void
    {
        $event = Event::factory()->birthdayOf($this->meera)->create([
            'creator_id' => $this->ravi->id,
            'occurred_on' => '2023-06-14',
        ]);

        $this->actingAs($this->ravi)->patch(route('apps.our-history.events.update', $event), [
            'occurred_on' => '2024-06-14',
        ])->assertSessionHasNoErrors();
        $this->assertSame($this->meera->id, $event->refresh()->birthday_user_id, 'Another year, the same birthday');

        $this->actingAs($this->ravi)->patch(route('apps.our-history.events.update', $event), [
            'occurred_on' => '2024-06-20',
        ])->assertSessionHasNoErrors();

        $this->assertNull($event->refresh()->birthday_user_id);
        $this->assertSame("Updated date and unlinked from Meera's birthday", $this->lastSummary($event));
    }

    private function lastSummary(Event $event): ?string
    {
        return EventChange::query()
            ->where('event_id', $event->id)
            ->where('action', 'edit')
            ->orderByDesc('id')
            ->value('summary');
    }
}
