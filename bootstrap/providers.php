<?php

use App\Providers\AppServiceProvider;
use App\Providers\FortifyServiceProvider;
use App\Providers\MiniAppServiceProvider;
use App\Shell\Providers\ShellServiceProvider;

return [
    ShellServiceProvider::class,
    AppServiceProvider::class,
    FortifyServiceProvider::class,
    MiniAppServiceProvider::class,
    // Mini apps' providers are registered by MiniAppServiceProvider when enabled; Telescope by
    // AppServiceProvider, in local only.
];
