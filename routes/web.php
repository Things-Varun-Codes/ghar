<?php

use App\Http\Controllers\HealthzController;
use App\Http\Controllers\ManifestController;
use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ThrottleHealthProbe;
use App\Shell\Controllers\Admin\InvitesController;
use App\Shell\Controllers\Admin\NotificationsController as AdminNotificationsController;
use App\Shell\Controllers\Admin\ShortLinksController;
use App\Shell\Controllers\Admin\ThemeController;
use App\Shell\Controllers\Admin\UsersController;
use App\Shell\Controllers\DashboardController;
use App\Shell\Controllers\InvitationAcceptController;
use App\Shell\Controllers\Settings\EmailVerificationController;
use App\Shell\Controllers\Settings\NotificationsController;
use App\Shell\Controllers\Settings\PasswordController;
use App\Shell\Controllers\Settings\ProfileController;
use App\Shell\Controllers\ShortLinkController;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;

/**
 * Outside the auth and CSRF groups so external probes reach it.
 */
Route::get('/healthz', HealthzController::class)
    ->middleware(ThrottleHealthProbe::using('healthz'))
    ->withoutMiddleware([
        HandleAppearance::class,
        HandleInertiaRequests::class,
        AddSecurityHeaders::class,
        AddLinkHeadersForPreloadedAssets::class,
        StartSession::class,
        ShareErrorsFromSession::class,
        PreventRequestForgery::class,
    ])
    ->name('healthz');

Route::get('/manifest.webmanifest', ManifestController::class)
    ->withoutMiddleware([
        HandleAppearance::class,
        HandleInertiaRequests::class,
        AddLinkHeadersForPreloadedAssets::class,
        StartSession::class,
        ShareErrorsFromSession::class,
        PreventRequestForgery::class,
    ])
    ->name('manifest');

Route::get('/', function () {
    return redirect()->to(Auth::check() ? '/dashboard' : '/login');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
        Route::patch('/profile', [ProfileController::class, 'update'])
            ->middleware('throttle:settings-profile')
            ->name('profile.update');
        Route::get('/password', [PasswordController::class, 'show'])->name('password.show');
        Route::put('/password', [PasswordController::class, 'update'])
            ->middleware('throttle:password-change')
            ->name('password.update');
        Route::get('/email/verify', [EmailVerificationController::class, 'verify'])->name('email.verify');

        Route::get('/notifications', [NotificationsController::class, 'show'])->name('notifications.show');
        Route::post('/notifications/subscribe', [NotificationsController::class, 'subscribe'])
            ->middleware('throttle:push-subscriptions')
            ->name('notifications.subscribe');
        Route::delete('/notifications/subscribe', [NotificationsController::class, 'unsubscribe'])
            ->middleware('throttle:push-subscriptions')
            ->name('notifications.unsubscribe');
    });
});

Route::middleware(['auth', 'can:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/invites', [InvitesController::class, 'index'])->name('invites.index');
    Route::post('/invites', [InvitesController::class, 'store'])
        ->middleware('throttle:invite-create')
        ->name('invites.store');
    Route::post('/invites/{invite}/resend', [InvitesController::class, 'resend'])
        ->middleware('throttle:invite-create')
        ->name('invites.resend');
    Route::delete('/invites/{invite}', [InvitesController::class, 'destroy'])
        ->middleware('throttle:admin-mutations')
        ->name('invites.destroy');

    Route::get('/theme', [ThemeController::class, 'index'])->name('theme.index');
    Route::post('/theme', [ThemeController::class, 'update'])
        ->middleware('throttle:admin-mutations')
        ->name('theme.update');

    Route::get('/notifications', [AdminNotificationsController::class, 'show'])->name('notifications.show');
    Route::post('/notifications', [AdminNotificationsController::class, 'send'])
        ->middleware('throttle:admin-mutations')
        ->name('notifications.send');

    Route::get('/users', [UsersController::class, 'index'])->name('users.index');
    Route::get('/users/{user}/edit', [UsersController::class, 'edit'])->name('users.edit');
    Route::patch('/users/{user}', [UsersController::class, 'update'])
        ->middleware('throttle:admin-mutations')
        ->name('users.update');
    Route::delete('/users/{user}', [UsersController::class, 'destroy'])
        ->middleware('throttle:admin-mutations')
        ->name('users.destroy');

    Route::get('/shortlinks', [ShortLinksController::class, 'index'])->name('shortlinks.index');
    Route::post('/shortlinks', [ShortLinksController::class, 'store'])
        ->middleware('throttle:admin-mutations')
        ->name('shortlinks.store');
    Route::patch('/shortlinks/{shortlink}', [ShortLinksController::class, 'update'])
        ->middleware('throttle:admin-mutations')
        ->name('shortlinks.update');
    Route::delete('/shortlinks/{shortlink}', [ShortLinksController::class, 'destroy'])
        ->middleware('throttle:admin-mutations')
        ->name('shortlinks.destroy');
});

Route::get('/go/{code}', ShortLinkController::class)
    ->middleware('auth')
    ->name('go');

Route::middleware(['throttle:invite-accept'])->group(function () {
    Route::get('/invitations/{token}', [InvitationAcceptController::class, 'show'])
        ->name('invitations.accept.show');
    Route::post('/invitations/{token}/accept', [InvitationAcceptController::class, 'store'])
        ->name('invitations.accept.store');
});

/**
 * Fortify's password.confirm* routes are 404'd by BlockUnwantedFortifyRoutes; a Route::any()
 * override here loses to Fortify under route:cache.
 */
