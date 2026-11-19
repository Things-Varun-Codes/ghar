<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventChange;
use App\MiniApps\History\Models\EventReaction;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class HistoryReactionsTest extends TestCase
{
    use RefreshDatabase;

    private User $asha;

    private User $ravi;

    private User $meera;

    private User $kabir;

    private Event $monsoon;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);

        $this->asha = User::factory()->admin()->create(['name' => 'Asha Rao']);
        $this->ravi = User::factory()->create(['name' => 'Ravi Rao']);
        $this->meera = User::factory()->create(['name' => 'Meera Rao']);
        $this->kabir = User::factory()->create(['name' => 'Kabir Rao']);
        $this->monsoon = Event::factory()->create([
            'creator_id' => $this->ravi->id,
            'title' => 'Monsoon drive to the coast',
            'updated_at' => now()->subWeek(),
        ]);
    }

    private function url(string $reaction, ?Event $event = null): string
    {
        return '/apps/our-history/events/'.($event ?? $this->monsoon)->id."/reactions/{$reaction}";
    }

    /** @return list<string> */
    private function reactionsOf(User $user): array
    {
        return EventReaction::query()
            ->where('event_id', $this->monsoon->id)
            ->where('user_id', $user->id)
            ->orderBy('reaction')
            ->pluck('reaction')
            ->all();
    }

    public function test_everyone_who_can_see_the_moment_may_react(): void
    {
        $back = "/apps/our-history?moment={$this->monsoon->id}";

        foreach ([$this->asha, $this->ravi, $this->meera, $this->kabir] as $member) {
            $this->actingAs($member)
                ->from($back)
                ->put($this->url('heart'))
                ->assertRedirect($back);

            $this->assertSame(['heart'], $this->reactionsOf($member));
        }
    }

    public function test_reacting_again_is_a_no_op_and_each_emoji_is_its_own(): void
    {
        $this->actingAs($this->meera)->put($this->url('heart'))->assertRedirect();
        $this->actingAs($this->meera)->put($this->url('heart'))->assertRedirect();
        $this->actingAs($this->meera)->put($this->url('laugh'))->assertRedirect();

        $this->assertSame(['heart', 'laugh'], $this->reactionsOf($this->meera));
    }

    public function test_removing_takes_only_the_viewers_one_emoji_and_is_idempotent(): void
    {
        foreach (['heart', 'party'] as $reaction) {
            EventReaction::factory()->create(['event_id' => $this->monsoon->id, 'user_id' => $this->meera->id, 'reaction' => $reaction]);
        }
        EventReaction::factory()->create(['event_id' => $this->monsoon->id, 'user_id' => $this->asha->id, 'reaction' => 'heart']);

        $this->actingAs($this->meera)->delete($this->url('heart'))->assertRedirect();
        $this->actingAs($this->meera)->delete($this->url('heart'))->assertRedirect();
        $this->actingAs($this->kabir)->delete($this->url('heart'))->assertRedirect();

        $this->assertSame(['party'], $this->reactionsOf($this->meera));
        $this->assertSame(['heart'], $this->reactionsOf($this->asha));
    }

    public function test_an_unknown_reaction_or_moment_is_404(): void
    {
        $this->actingAs($this->meera)->put($this->url('thumbs'))->assertNotFound();
        $this->actingAs($this->meera)->put($this->url(rawurlencode('❤️')))->assertNotFound();
        $this->actingAs($this->meera)->delete($this->url('thumbs'))->assertNotFound();
        $this->actingAs($this->meera)->put('/apps/our-history/events/999999/reactions/heart')->assertNotFound();

        $deleted = Event::factory()->deleted()->create(['creator_id' => $this->ravi->id]);
        $this->actingAs($this->meera)->put($this->url('heart', $deleted))->assertNotFound();

        $this->assertSame(0, EventReaction::query()->count());
    }

    public function test_a_guest_cannot_react(): void
    {
        $this->put($this->url('heart'))->assertRedirect('/login');

        $this->assertSame(0, EventReaction::query()->count());
    }

    public function test_a_reaction_sends_no_push_and_leaves_the_moment_untouched(): void
    {
        Notification::fake();
        $updatedAt = $this->monsoon->fresh()?->updated_at;
        $changes = EventChange::query()->count();

        $this->actingAs($this->meera)->put($this->url('wow'))->assertRedirect();
        $this->actingAs($this->meera)->delete($this->url('wow'))->assertRedirect();

        Notification::assertNothingSent();
        $this->assertEquals($updatedAt, $this->monsoon->fresh()?->updated_at);
        $this->assertSame($changes, EventChange::query()->count());
    }

    public function test_reactions_spend_their_own_limiter(): void
    {
        foreach (['apps.our-history.events.reactions.update', 'apps.our-history.events.reactions.destroy'] as $name) {
            $middleware = Route::getRoutes()->getByName($name)?->gatherMiddleware() ?? [];

            $this->assertContains('throttle:history-reactions', $middleware);
            $this->assertNotContains('throttle:history-mutations', $middleware);
        }
    }
}
