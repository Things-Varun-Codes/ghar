<?php

namespace Tests\Feature\History;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventChange;
use App\MiniApps\History\Models\EventComment;
use App\Shell\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class HistoryCommentsTest extends TestCase
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

    private function storeUrl(?Event $event = null): string
    {
        return '/apps/our-history/events/'.($event ?? $this->monsoon)->id.'/comments';
    }

    private function commentUrl(EventComment $comment, ?Event $event = null): string
    {
        return $this->storeUrl($event)."/{$comment->id}";
    }

    private function commentBy(User $author, string $body = 'What a day'): EventComment
    {
        return EventComment::factory()->create([
            'event_id' => $this->monsoon->id,
            'author_id' => $author->id,
            'body' => $body,
        ]);
    }

    public function test_everyone_who_can_see_the_moment_may_comment(): void
    {
        $back = "/apps/our-history?moment={$this->monsoon->id}";

        foreach ([$this->asha, $this->ravi, $this->meera, $this->kabir] as $member) {
            $this->actingAs($member)
                ->from($back)
                ->post($this->storeUrl(), ['body' => "From {$member->firstName()}"])
                ->assertSessionHasNoErrors()
                ->assertRedirect($back);
        }

        $this->assertSame(
            [
                [$this->asha->id, 'From Asha'],
                [$this->ravi->id, 'From Ravi'],
                [$this->meera->id, 'From Meera'],
                [$this->kabir->id, 'From Kabir'],
            ],
            EventComment::query()
                ->where('event_id', $this->monsoon->id)
                ->orderBy('id')
                ->get()
                ->map(fn (EventComment $c): array => [$c->author_id, $c->body])
                ->all(),
        );
    }

    public function test_the_body_is_trimmed_and_keeps_its_line_breaks(): void
    {
        $this->actingAs($this->meera)
            ->post($this->storeUrl(), ['body' => "  The waves!\n\nAnd the chai.  "])
            ->assertSessionHasNoErrors();

        $this->assertSame("The waves!\n\nAnd the chai.", EventComment::query()->sole()->body);
    }

    public function test_a_blank_or_too_long_comment_is_refused_with_a_field_error(): void
    {
        foreach (['', "   \n\t ", null] as $blank) {
            $this->actingAs($this->meera)
                ->postJson($this->storeUrl(), ['body' => $blank])
                ->assertStatus(422)
                ->assertJsonValidationErrors(['body']);
        }

        $this->actingAs($this->meera)
            ->postJson($this->storeUrl(), ['body' => str_repeat('é', EventComment::MAX_LENGTH + 1)])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);

        $this->actingAs($this->meera)
            ->postJson($this->storeUrl(), ['body' => ['not', 'text']])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);

        $this->assertSame(0, EventComment::query()->count());

        $this->actingAs($this->meera)
            ->post($this->storeUrl(), ['body' => str_repeat('é', EventComment::MAX_LENGTH)])
            ->assertSessionHasNoErrors();

        $this->assertSame(1, EventComment::query()->count());
    }

    public function test_the_sheet_gets_the_field_error_back_on_the_open_moment(): void
    {
        $back = "/apps/our-history?moment={$this->monsoon->id}";

        $this->actingAs($this->meera)
            ->from($back)
            ->post($this->storeUrl(), ['body' => '  '])
            ->assertRedirect($back)
            ->assertSessionHasErrors('body');
    }

    public function test_an_unknown_or_deleted_moment_is_404(): void
    {
        $this->actingAs($this->meera)
            ->post('/apps/our-history/events/999999/comments', ['body' => 'Hello'])
            ->assertNotFound();

        $deleted = Event::factory()->deleted()->create(['creator_id' => $this->ravi->id]);
        $this->actingAs($this->meera)
            ->post($this->storeUrl($deleted), ['body' => 'Hello'])
            ->assertNotFound();

        $this->assertSame(0, EventComment::query()->count());
    }

    public function test_a_guest_cannot_comment(): void
    {
        $this->post($this->storeUrl(), ['body' => 'Hello'])->assertRedirect('/login');

        $this->assertSame(0, EventComment::query()->count());
    }

    public function test_the_author_may_delete_their_comment(): void
    {
        $comment = $this->commentBy($this->meera);
        $back = "/apps/our-history?moment={$this->monsoon->id}";

        $this->actingAs($this->meera)
            ->from($back)
            ->delete($this->commentUrl($comment))
            ->assertRedirect($back);

        $this->assertModelMissing($comment);
    }

    public function test_an_admin_may_delete_anyones_comment(): void
    {
        $comment = $this->commentBy($this->kabir);

        $this->actingAs($this->asha)->delete($this->commentUrl($comment))->assertRedirect();

        $this->assertModelMissing($comment);
    }

    public function test_nobody_else_may_delete_a_comment_not_even_the_moments_creator(): void
    {
        $comment = $this->commentBy($this->kabir);

        $this->actingAs($this->ravi)->delete($this->commentUrl($comment))->assertForbidden();
        $this->actingAs($this->meera)->delete($this->commentUrl($comment))->assertForbidden();

        $this->assertModelExists($comment);
    }

    public function test_a_departed_authors_comment_is_only_an_admins_to_delete(): void
    {
        $gone = User::factory()->create();
        $comment = $this->commentBy($gone);
        $gone->delete();

        $this->actingAs($this->meera)->delete($this->commentUrl($comment))->assertForbidden();
        $this->actingAs($this->asha)->delete($this->commentUrl($comment))->assertRedirect();

        $this->assertModelMissing($comment);
    }

    public function test_another_moments_comment_is_404(): void
    {
        $other = Event::factory()->create(['creator_id' => $this->meera->id]);
        $comment = $this->commentBy($this->meera);

        $this->actingAs($this->meera)->delete($this->commentUrl($comment, $other))->assertNotFound();
        $this->actingAs($this->asha)->delete($this->commentUrl($comment, $other))->assertNotFound();

        $this->assertModelExists($comment);
    }

    public function test_a_comment_cannot_be_edited(): void
    {
        $comment = $this->commentBy($this->meera);

        $this->actingAs($this->meera)
            ->patch($this->commentUrl($comment), ['body' => 'Changed'])
            ->assertMethodNotAllowed();

        $this->assertSame('What a day', $comment->fresh()?->body);
    }

    public function test_commenting_leaves_the_moment_and_its_activity_alone(): void
    {
        $updatedAt = $this->monsoon->fresh()?->updated_at;
        $changes = EventChange::query()->count();

        $this->actingAs($this->meera)->post($this->storeUrl(), ['body' => 'Lovely'])->assertSessionHasNoErrors();
        $this->actingAs($this->meera)->delete($this->commentUrl(EventComment::query()->sole()))->assertRedirect();

        $this->assertEquals($updatedAt, $this->monsoon->fresh()?->updated_at);
        $this->assertSame($changes, EventChange::query()->count());
    }

    public function test_comments_spend_their_own_limiter(): void
    {
        foreach (['apps.our-history.events.comments.store', 'apps.our-history.events.comments.destroy'] as $name) {
            $middleware = Route::getRoutes()->getByName($name)?->gatherMiddleware() ?? [];

            $this->assertContains('throttle:history-comments', $middleware);
            $this->assertNotContains('throttle:history-mutations', $middleware);
        }

        for ($i = 1; $i <= 20; $i++) {
            $this->actingAs($this->kabir)->post($this->storeUrl(), ['body' => "Comment {$i}"])->assertRedirect();
        }
        $this->actingAs($this->kabir)->post($this->storeUrl(), ['body' => 'One too many'])->assertTooManyRequests();

        // Per person: Kabir's burst doesn't stop Meera.
        $this->actingAs($this->meera)->post($this->storeUrl(), ['body' => 'Still here'])->assertRedirect();
        $this->assertSame(21, EventComment::query()->count());
    }
}
