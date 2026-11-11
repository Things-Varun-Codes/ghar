<?php

namespace App\MiniApps\Corner\Providers;

use App\MiniApps\Corner\Policies\ListItemPolicy;
use App\MiniApps\Corner\Support\DashboardLine;
use App\MiniApps\Corner\Support\DashboardPreview;
use App\Shell\Models\User;
use App\Shell\Services\DashboardSummaries;
use App\Shell\Services\LinkableEntities;
use App\Shell\Services\UserOwnedContent;
use App\Shell\Support\CursorList;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class CornerServiceProvider extends ServiceProvider
{
    public function boot(LinkableEntities $linkable, DashboardSummaries $summaries, UserOwnedContent $ownedContent): void
    {
        $ownedContent->register('corner_songs', ['added_by_user_id'], 'Corner songs');
        $ownedContent->register('corner_movies', ['added_by_user_id'], 'Corner movies');
        $ownedContent->register('corner_activities', ['added_by_user_id'], 'Corner activities');
        $ownedContent->register('corner_places', ['added_by_user_id'], 'Corner places');

        $summaries->register('our-corner', fn (User $user): ?string => DashboardLine::forUser($user));
        $summaries->registerPreview('our-corner', fn (User $user): ?array => DashboardPreview::forUser($user));

        foreach (config('corner-lists', []) as $listConfig) {
            $type = $listConfig['entity_type'];
            $modelClass = $listConfig['model'];
            $slug = $listConfig['slug'];

            Gate::policy($modelClass, ListItemPolicy::class);

            $linkable->register(
                $type,
                listing: $this->makeListing($modelClass, $slug),
                resolve: $this->makeResolve($modelClass, $slug),
                resolveMany: $this->makeResolveMany($modelClass, $slug),
            );
        }
    }

    private function makeListing(string $modelClass, string $slug): \Closure
    {
        return function (string $q, int $limit) use ($modelClass, $slug): array {
            return $modelClass::query()
                ->where('title', 'ilike', CursorList::containsPattern($q))
                ->limit($limit)
                ->get()
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'title' => $m->title,
                    'thumbnail_url' => $this->thumbnailFor($m),
                    // From the named route, so a newly inserted cross-link pill carries a
                    // populated data-corner-href.
                    'deep_link_url' => route("apps.our-corner.{$slug}.show", $m),
                ])
                ->all();
        };
    }

    private function makeResolve(string $modelClass, string $slug): \Closure
    {
        return function (int $id) use ($modelClass, $slug): ?array {
            $model = $modelClass::find($id);
            if ($model === null) {
                return null;
            }

            return $this->snapshotFor($model, $slug);
        };
    }

    /**
     * @return \Closure(list<int>): array<int, array{title: string, thumbnail_url: ?string, deep_link_url: string}>
     */
    private function makeResolveMany(string $modelClass, string $slug): \Closure
    {
        return function (array $ids) use ($modelClass, $slug): array {
            return $modelClass::query()
                ->whereIn('id', $ids)
                ->get()
                ->mapWithKeys(fn ($model) => [$model->id => $this->snapshotFor($model, $slug)])
                ->all();
        };
    }

    /** @return array{title: string, thumbnail_url: ?string, deep_link_url: string} */
    private function snapshotFor(object $model, string $slug): array
    {
        return [
            'title' => $model->title,
            'thumbnail_url' => $this->thumbnailFor($model),
            'deep_link_url' => route("apps.our-corner.{$slug}.show", $model),
        ];
    }

    private function thumbnailFor(object $model): ?string
    {
        if (isset($model->thumbnail_url)) {
            return $model->thumbnail_url;
        }

        if (isset($model->poster_url)) {
            return $model->poster_url;
        }

        return null;
    }
}
