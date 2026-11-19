<?php

namespace Tests\Feature\Notifications;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventComment;
use App\Shell\Models\User;
use App\Shell\Notifications\GenericPushNotification;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class HistoryCommentPushTest extends TestCase
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
        Notification::fake();

        $this->asha = User::factory()->admin()->create(['name' => 'Asha Rao']);
        $this->ravi = User::factory()->create(['name' => 'Ravi Rao']);
        $this->meera = User::factory()->create(['name' => 'Meera Rao']);
        $this->kabir = User::factory()->create(['name' => 'Kabir Rao']);
        $this->monsoon = Event::factory()->create([
            'creator_id' => $this->ravi->id,
            'title' => 'Monsoon drive to the coast',
        ]);
    }

    private function comment(User $author, string $body, ?Event $event = null): void
    {
        $this->actingAs($author)
            ->post('/apps/our-history/events/'.($event ?? $this->monsoon)->id.'/comments', ['body' => $body])
            ->assertSessionHasNoErrors()
            ->assertRedirect();
    }

    private function earlierComment(User $author): void
    {
        EventComment::factory()->create(['event_id' => $this->monsoon->id, 'author_id' => $author->id]);
    }

    /** @return array<string, mixed> */
    private function message(User $recipient): array
    {
        $sent = Notification::sent($recipient, GenericPushNotification::class)->sole();

        return $sent->toWebPush($recipient, $sent)->toArray();
    }

    public function test_the_first_comment_tells_only_the_moments_creator(): void
    {
        $this->comment($this->meera, 'The waves!');

        Notification::assertSentToTimes($this->ravi, GenericPushNotification::class, 1);
        Notification::assertNotSentTo([$this->meera, $this->kabir, $this->asha], GenericPushNotification::class);
    }

    public function test_a_reply_tells_the_creator_and_earlier_commenters_once_each_but_not_the_commenter(): void
    {
        $this->earlierComment($this->meera);
        $this->earlierComment($this->meera);
        $this->earlierComment($this->kabir);

        $this->comment($this->kabir, 'And the chai');

        Notification::assertSentToTimes($this->ravi, GenericPushNotification::class, 1);
        Notification::assertSentToTimes($this->meera, GenericPushNotification::class, 1);
        Notification::assertNotSentTo([$this->kabir, $this->asha], GenericPushNotification::class);
    }

    public function test_the_creator_commenting_tells_the_earlier_commenters_only(): void
    {
        $this->earlierComment($this->meera);
        $this->earlierComment($this->ravi);

        $this->comment($this->ravi, 'Again next year');

        Notification::assertSentToTimes($this->meera, GenericPushNotification::class, 1);
        Notification::assertNotSentTo([$this->ravi, $this->kabir, $this->asha], GenericPushNotification::class);
    }

    public function test_departed_people_are_skipped(): void
    {
        $gone = User::factory()->create();
        $orphan = Event::factory()->create(['creator_id' => $gone->id, 'title' => 'Old trip']);
        EventComment::factory()->create(['event_id' => $orphan->id, 'author_id' => $gone->id]);
        $gone->delete();

        $this->comment($this->meera, 'Hello?', $orphan);

        Notification::assertNothingSent();
    }

    public function test_the_push_names_the_commenter_and_moment_but_never_the_text(): void
    {
        $this->comment($this->meera, 'A secret only the sheet should show');

        $message = $this->message($this->ravi);

        $this->assertSame('Meera commented on a moment: Monsoon drive to the coast', $message['body']);
        $this->assertStringNotContainsString('secret', json_encode($message, JSON_THROW_ON_ERROR));
        $this->assertSame("our-history:comment:{$this->monsoon->id}", $message['tag']);
        $this->assertSame(['url' => "/apps/our-history?moment={$this->monsoon->id}"], $message['data']);
    }

    public function test_an_untitled_moment_reads_naturally(): void
    {
        $untitled = Event::factory()->create(['creator_id' => $this->ravi->id, 'title' => null]);

        $this->comment($this->kabir, 'Where was this?', $untitled);

        $this->assertSame('Kabir commented on a moment', $this->message($this->ravi)['body']);
    }

    public function test_a_refused_or_deleted_comment_sends_nothing(): void
    {
        $this->actingAs($this->meera)
            ->post("/apps/our-history/events/{$this->monsoon->id}/comments", ['body' => '   '])
            ->assertSessionHasErrors('body');

        $comment = EventComment::factory()->create(['event_id' => $this->monsoon->id, 'author_id' => $this->meera->id]);
        $this->actingAs($this->meera)
            ->delete("/apps/our-history/events/{$this->monsoon->id}/comments/{$comment->id}")
            ->assertRedirect();

        Notification::assertNothingSent();
    }
}
