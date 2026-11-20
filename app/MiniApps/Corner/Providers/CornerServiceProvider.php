<?php

namespace App\MiniApps\Corner\Providers;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Policies\CornerListPolicy;
use App\MiniApps\Corner\Policies\ListItemPolicy;
use App\MiniApps\Corner\Support\CornerLinks;
use App\MiniApps\Corner\Support\DashboardFeed;
use App\MiniApps\Corner\Support\DashboardLine;
use App\MiniApps\Corner\Support\DashboardPreview;
use App\Shell\Models\User;
use App\Shell\Services\DashboardSummaries;
use App\Shell\Services\LinkableEntities;
use App\Shell\Services\UserOwnedContent;
use App\Shell\Support\Limits;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class CornerServiceProvider extends ServiceProvider
{
    public const SLUG = 'our-shelf';

    public function boot(LinkableEntities $linkable, DashboardSummaries $summaries, UserOwnedContent $ownedContent): void
    {
        $ownedContent->register('corner_items', ['added_by_user_id'], 'Shelf items');

        $summaries->register(self::SLUG, fn (User $user): ?string => DashboardLine::forUser($user));
        $summaries->registerPreview(self::SLUG, fn (User $user): ?array => DashboardPreview::forUser($user));
        $summaries->registerFeed(self::SLUG, fn (User $user, CarbonImmutable $since): array => DashboardFeed::forUser($user, $since));

        Gate::policy(CornerList::class, CornerListPolicy::class);
        Gate::policy(Item::class, ListItemPolicy::class);

        RateLimiter::for('corner-mutations', Limits::perUser(30));

        CornerLinks::register($linkable);
    }
}
