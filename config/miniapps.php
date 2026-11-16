<?php

use App\MiniApps\Corner\Providers\CornerServiceProvider;
use App\MiniApps\History\Providers\HistoryServiceProvider;
use App\MiniApps\Mailbox\Providers\MailboxServiceProvider;

/**
 * Array order is display order, on Home and in the phone bottom bar (Home plus the first four).
 * `component_prefix` tells AppLayout which room a page belongs to. `nav_label` is the short
 * bottom-bar label; `icon` a lucide icon name the shell knows (BottomBar.tsx), else a neutral tile.
 * See CONTRIBUTING.md for adding an app.
 */

return [
    [
        'name' => 'Our History',
        'nav_label' => 'History',
        'icon' => 'BookHeart',
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
        'nav_label' => 'Corner',
        'icon' => 'Sofa',
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
        'nav_label' => 'Mailbox',
        'icon' => 'Mailbox',
        'slug' => 'our-mailbox',
        'route' => '/apps/our-mailbox',
        'description' => 'Notes, flowers and the occasional fine.',
        'enabled' => true,
        'provider' => MailboxServiceProvider::class,
        'admin_only' => false,
        'component_prefix' => 'MiniApps/Mailbox/',
    ],
];
