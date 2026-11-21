<?php

namespace App\Shell\Controllers\Settings;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Fortify;

/**
 * Turning two-step sign-in on and off posts straight to Fortify's own routes; this page only
 * shows the state.
 */
class SecurityController
{
    public function show(Request $request): Response
    {
        $user = $request->user();
        $enabled = $user->two_factor_confirmed_at !== null;
        $pending = ! $enabled && $user->two_factor_secret !== null;
        $codes = fn () => $enabled ? $user->recoveryCodes() : null;

        // Codes appear by themselves right after they are made; otherwise only on request.
        $justMade = in_array($request->session()->get('status'), [
            Fortify::TWO_FACTOR_AUTHENTICATION_CONFIRMED,
            Fortify::RECOVERY_CODES_GENERATED,
        ], true);

        return Inertia::render('Shell/Pages/Settings/Security', [
            'enabled' => $enabled,
            'pending' => $pending,
            'qrSvg' => $pending ? $user->twoFactorQrCodeSvg() : null,
            'setupKey' => $pending ? Fortify::currentEncrypter()->decrypt($user->two_factor_secret) : null,
            'recoveryCodes' => $justMade ? $codes() : Inertia::optional($codes),
        ]);
    }
}
