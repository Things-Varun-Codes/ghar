<?php

namespace App\Shell\Providers;

use App\Shell\Auth\ShellLockoutResponse;
use App\Shell\Listeners\BlockLastAdminDemotion;
use App\Shell\Listeners\ReportFailedPush;
use App\Shell\Listeners\UpdateLastLoginAt;
use App\Shell\Models\User;
use App\Shell\Observers\UserObserver;
use App\Shell\Services\DashboardSummaries;
use App\Shell\Services\Household;
use App\Shell\Services\LinkableEntities;
use App\Shell\Services\Notify;
use App\Shell\Services\UserOwnedContent;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Fortify\Contracts\LockoutResponse;
use NotificationChannels\WebPush\Events\NotificationFailed;
use Spatie\Permission\Events\RoleDetachedEvent;

class ShellServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Notify::class);

        $this->app->singleton(Household::class);

        $this->app->singleton(LinkableEntities::class);

        $this->app->singleton(DashboardSummaries::class);
        $this->app->singleton(UserOwnedContent::class);

        $this->app->singleton(LockoutResponse::class, ShellLockoutResponse::class);
    }

    public function boot(): void
    {
        // Must register before anything reads from the database.
        $this->loadMigrationsFrom(database_path('migrations/shell'));

        Gate::define('admin', fn (User $user) => $user->hasRole('admin'));

        User::observe(UserObserver::class);

        Event::listen(RoleDetachedEvent::class, BlockLastAdminDemotion::class);

        Event::listen(Login::class, UpdateLastLoginAt::class);

        Event::listen(NotificationFailed::class, ReportFailedPush::class);
    }
}
