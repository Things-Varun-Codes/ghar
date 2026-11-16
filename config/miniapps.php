<?php

use App\MiniApps\Corner\Providers\CornerServiceProvider;
use App\MiniApps\History\Providers\HistoryServiceProvider;
use App\MiniApps\Mailbox\Providers\MailboxServiceProvider;

/**
 * Array order is display order, on Home and in the phone bottom bar (Home plus the first four).
 * `component_prefix` tells AppLayout which room a page belongs to. `nav_label` is the short
 * bottom-bar label; the bar icon is the room's `nav-icon.tsx`.
 * See CONTRIBUTING.md for adding an app.
 */

return [
    [
        'name' => 'Our History',
        'nav_label' => 'History',
        'slug' => 'our-history',
        'route' => '/apps/our-history',
        'description' => 'The days you want to remember, with their photos.',
        'enabled' => true,
        'provider' => HistoryServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/History/',
    ],

    [
        'name' => 'Our Corner',
        'nav_label' => 'Corner',
        'slug' => 'our-corner',
        'route' => '/apps/our-corner',
        'description' => 'Songs, movies, places and things to do together.',
        'enabled' => true,
        'provider' => CornerServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/Corner/',
    ],

    [
        'name' => 'Our Mailbox',
        'nav_label' => 'Mailbox',
        'slug' => 'our-mailbox',
        'route' => '/apps/our-mailbox',
        'description' => 'Notes, flowers, challans and coupons for each other.',
        'enabled' => true,
        'provider' => MailboxServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/Mailbox/',
    ],
];
