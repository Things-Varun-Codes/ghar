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
    ],

    // Must stay true: `views` also gates GET /login.
    'views' => true,

    'features' => [
        Features::resetPasswords(),
    ],
];
