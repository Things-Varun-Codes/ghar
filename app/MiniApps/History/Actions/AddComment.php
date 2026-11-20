<?php

namespace App\MiniApps\History\Actions;

use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventComment;
use App\MiniApps\History\Providers\HistoryServiceProvider;
use App\MiniApps\History\Support\RequestedMoment;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Services\PushDispatcher;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Tells the moment's creator and everyone who commented before, never the commenter. The
 * moment's updated_at and activity log stay as they were: a comment isn't an edit.
 */
class AddComment
{
    public function __construct(
        private readonly Household $household,
        private readonly PushDispatcher $dispatcher,
    ) {}

    public function __invoke(Event $event, string $body, User $author): EventComment
    {
        [$comment, $recipients] = DB::transaction(function () use ($event, $body, $author): array {
            $comment = EventComment::query()->create([
                'event_id' => $event->id,
                'author_id' => $author->id,
                'body' => $body,
            ]);

            return [$comment, $this->recipients($event, $comment, $author)];
        });

        // After the transaction returns, as Mailbox does: a rolled-back comment is never pushed.
        // The body leaves the comment's text out, since it shows on a lock screen.
        $this->dispatcher->toUsers(
            $recipients,
            HistoryServiceProvider::SLUG,
            HistoryServiceProvider::SLUG.':comment:'.$event->id,
            $event->title === null
                ? "{$author->firstName()} commented on a moment"
                : "{$author->firstName()} commented on a moment: {$event->title}",
            RequestedMoment::url($event->id),
        );

        return $comment;
    }

    /** @return Collection<int, User> */
    private function recipients(Event $event, EventComment $comment, User $author): Collection
    {
        $ids = EventComment::query()
            ->where('event_id', $event->id)
            ->where('id', '<', $comment->id)
            ->whereNotNull('author_id')
            ->pluck('author_id')
            ->push($event->creator_id)
            ->filter()
            ->reject(fn (int $id): bool => $id === $author->id)
            ->unique()
            ->values()
            ->all();

        return $this->household->query()->whereKey($ids)->get();
    }
}
