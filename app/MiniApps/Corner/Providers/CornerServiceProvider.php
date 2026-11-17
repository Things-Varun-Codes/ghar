<?php

namespace App\MiniApps\Corner\Providers;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Policies\CornerListPolicy;
use App\MiniApps\Corner\Policies\ListItemPolicy;
use App\MiniApps\Corner\Support\CornerLinks;
use App\MiniApps\Corner\Support\DashboardLine;
use App\MiniApps\Corner\Support\DashboardPreview;
use App\Shell\Models\User;
use App\Shell\Services\DashboardSummaries;
use App\Shell\Services\LinkableEntities;
use App\Shell\Services\UserOwnedContent;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class CornerServiceProvider extends ServiceProvider
{
    public function boot(LinkableEntities $linkable, DashboardSummaries $summaries, UserOwnedContent $ownedContent): void
    {
        $ownedContent->register('corner_items', ['added_by_user_id'], 'Corner items');

        $summaries->register('our-corner', fn (User $user): ?string => DashboardLine::forUser($user));
        $summaries->registerPreview('our-corner', fn (User $user): ?array => DashboardPreview::forUser($user));

        Gate::policy(CornerList::class, CornerListPolicy::class);
        Gate::policy(Item::class, ListItemPolicy::class);

        CornerLinks::register($linkable);
    }
}
