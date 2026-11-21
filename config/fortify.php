<?php

use Laravel\Fortify\Features;

return [
    'guard' => 'web',

    'passwords' => 'users',

    'username' => 'email',

    'email' => 'email',

    'lowercase_usernames' => true,

    'home' => '/dashboard',

    'prefix' => '',

    'domain' => null,

    'middleware' => ['web'],

    'limiters' => [
        // Deliberately no 'login' limiter: it would attach route-level throttle middleware
        // that 429s before EnsureLoginIsNotThrottled can render the cooldown UI.
        // The code challenge has no in-pipeline throttle, so it needs this one.
        'two-factor' => 'two-factor',
    ],

    // Must stay true: `views` also gates GET /login.
    'views' => true,

    'features' => [
        Features::resetPasswords(),
        Features::twoFactorAuthentication([
            'confirm' => true,
            'confirmPassword' => true,
        ]),
    ],
];
