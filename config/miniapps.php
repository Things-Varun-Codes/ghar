<?php

use App\MiniApps\Corner\Providers\CornerServiceProvider;
use App\MiniApps\History\Providers\HistoryServiceProvider;
use App\MiniApps\Mailbox\Providers\MailboxServiceProvider;

/**
 * Every entry is installed. The admin turns rooms on and off at /admin/rooms, and a fresh install
 * starts with none on. Array order is display order, on Home and in the phone bottom bar (Home plus the first four).
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
        'provider' => HistoryServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/History/',
    ],

    [
        'name' => 'Our Shelf',
        'nav_label' => 'Shelf',
        'slug' => 'our-shelf',
        'route' => '/apps/our-shelf',
        'description' => 'Shared lists you make together: songs, films, places, books, anything.',
        'provider' => CornerServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/Corner/',
    ],

    [
        'name' => 'Our Exchange',
        'nav_label' => 'Exchange',
        'slug' => 'our-exchange',
        'route' => '/apps/our-exchange',
        'description' => 'Notes, flowers, citations and coupons for each other.',
        'provider' => MailboxServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/Mailbox/',
    ],
];
