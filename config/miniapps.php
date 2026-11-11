<?php

use App\MiniApps\Corner\Providers\CornerServiceProvider;
use App\MiniApps\History\Providers\HistoryServiceProvider;
use App\MiniApps\Mailbox\Providers\MailboxServiceProvider;

/**
 * Array order is display order. `component_prefix` tells AppLayout when it is inside this
 * app, to hide the shell chrome. See CONTRIBUTING.md for adding an app.
 */

return [
    [
        'name' => 'Our History',
        'slug' => 'our-history',
        'route' => '/apps/our-history',
        'description' => 'Birthdays, trips and the day the fridge died.',
        'enabled' => true,
        'provider' => HistoryServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/History/',
    ],

    [
        'name' => 'Our Corner',
        'slug' => 'our-corner',
        'route' => '/apps/our-corner',
        'description' => 'Songs, films and places to get to someday.',
        'enabled' => true,
        'provider' => CornerServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/Corner/',
    ],

    [
        'name' => 'Our Mailbox',
        'slug' => 'our-mailbox',
        'route' => '/apps/our-mailbox',
        'description' => 'Notes, flowers and the occasional fine.',
        'enabled' => true,
        'provider' => MailboxServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/Mailbox/',
    ],
];
