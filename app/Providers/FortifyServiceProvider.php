<?php

namespace App\Providers;

use App\Actions\Fortify\EnumerationResistantPasswordResetLinkResponse;
use App\Actions\Fortify\ResetUserPassword;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\ResetsUserPasswords;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Fortify's own provider may not have bound this before the controller resolves it in
        // tests.
        $this->app->singleton(ResetsUserPasswords::class, ResetUserPassword::class);

        $this->app->singleton(
            FailedPasswordResetLinkRequestResponse::class,
            EnumerationResistantPasswordResetLinkResponse::class
        );
    }

    public function boot(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('Shell/Pages/Auth/Login', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('Shell/Pages/Auth/ForgotPassword', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('Shell/Pages/Auth/ResetPassword', [
            'token' => $request->route('token'),
            'email' => $request->query('email', ''),
        ]));
    }
}
