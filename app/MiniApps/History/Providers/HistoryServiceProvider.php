<?php

namespace App\MiniApps\History\Providers;

use App\MiniApps\History\Console\PruneOrphanedMedia;
use App\MiniApps\History\Console\SendMorningMemories;
use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventComment;
use App\MiniApps\History\Observers\MediaDimensionsObserver;
use App\MiniApps\History\Policies\CommentPolicy;
use App\MiniApps\History\Policies\EventPolicy;
use App\MiniApps\History\Support\DashboardFeed;
use App\MiniApps\History\Support\RequestedMoment;
use App\Shell\Models\User;
use App\Shell\Services\DashboardSummaries;
use App\Shell\Services\LinkableEntities;
use App\Shell\Support\CursorList;
use App\Shell\Support\Limits;
use App\Shell\Support\Region;
use Carbon\CarbonImmutable;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class HistoryServiceProvider extends ServiceProvider
{
    public const SLUG = 'our-history';

    public function register(): void {}

    public function boot(LinkableEntities $linkable, DashboardSummaries $summaries): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([PruneOrphanedMedia::class, SendMorningMemories::class]);
        }

        // Run `php artisan history:prune-media --dry-run` first to see what it will remove.
        $this->callAfterResolving(Schedule::class, function (Schedule $schedule): void {
            $schedule->command('history:prune-media')
                ->dailyAt('03:00')
                ->onOneServer()
                ->runInBackground();

            // Hourly through the morning, so a server that was down at nine still sends; the
            // command's day claim makes every run after the first a no-op.
            $schedule->command('history:morning-memories')
                ->hourly()
                ->between('09:00', '12:00')
                ->timezone(Region::timezone())
                ->onOneServer();
        });

        Gate::policy(Event::class, EventPolicy::class);
        Gate::policy(EventComment::class, CommentPolicy::class);

        RateLimiter::for('history-mutations', Limits::perUser(30));
        // Their own budgets: uploads spend history-mutations, and a burst of photos must not
        // stop someone reacting or replying.
        RateLimiter::for('history-reactions', Limits::perUser(60));
        RateLimiter::for('history-comments', Limits::perUser(20));

        $summaries->registerFeed(self::SLUG, fn (User $user, CarbonImmutable $since): array => DashboardFeed::forUser($user, $since));

        Media::observe(MediaDimensionsObserver::class);

        $linkable->register(
            type: 'history.event',
            label: 'Moments',
            room: self::SLUG,
            resolveMany: fn (array $ids): array => Event::query()
                ->whereIn('id', $ids)
                ->get()
                ->mapWithKeys(fn (Event $e) => [$e->id => $this->snapshotFor($e)])
                ->all(),
            listing: fn (string $q, int $limit): array => Event::query()
                ->where(function ($builder) use ($q) {
                    $pattern = CursorList::containsPattern($q);
                    $builder->where('title', 'ilike', $pattern)
                        ->orWhere('body_html', 'ilike', $pattern);
                })
                ->orderByDesc('occurred_on')
                ->limit($limit)
                ->get()
                ->map(fn (Event $e) => ['id' => $e->id] + $this->snapshotFor($e))
                ->all(),
        );
    }

    /** @return array{title: string, thumbnail_url: null, icon: string, deep_link_url: string} */
    private function snapshotFor(Event $event): array
    {
        return [
            'title' => $event->title ?: $event->occurred_on->toDateString(),
            'thumbnail_url' => null,
            'icon' => 'book-heart',
            'deep_link_url' => RequestedMoment::url($event->id),
        ];
    }
}
