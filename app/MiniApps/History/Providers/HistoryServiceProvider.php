<?php

namespace App\MiniApps\History\Providers;

use App\MiniApps\History\Console\PruneOrphanedMedia;
use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Observers\MediaDimensionsObserver;
use App\MiniApps\History\Policies\EventPolicy;
use App\MiniApps\History\Support\DashboardLine;
use App\MiniApps\History\Support\DashboardPreview;
use App\MiniApps\History\Support\RequestedMoment;
use App\Shell\Models\User;
use App\Shell\Services\DashboardSummaries;
use App\Shell\Services\LinkableEntities;
use App\Shell\Support\CursorList;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class HistoryServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(LinkableEntities $linkable, DashboardSummaries $summaries): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([PruneOrphanedMedia::class]);
        }

        // Run `php artisan history:prune-media --dry-run` first to see what it will remove.
        $this->callAfterResolving(Schedule::class, function (Schedule $schedule): void {
            $schedule->command('history:prune-media')
                ->dailyAt('03:00')
                ->onOneServer()
                ->runInBackground();
        });

        Gate::policy(Event::class, EventPolicy::class);

        $summaries->register('our-history', fn (User $user): ?string => DashboardLine::forUser($user));
        $summaries->registerPreview('our-history', fn (User $user): ?array => DashboardPreview::forUser($user));

        Media::observe(MediaDimensionsObserver::class);

        $linkable->register(
            type: 'history.event',
            label: 'Moments',
            room: 'our-history',
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
