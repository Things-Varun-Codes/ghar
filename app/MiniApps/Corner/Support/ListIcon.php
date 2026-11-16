<?php

namespace App\MiniApps\Corner\Support;

final class ListIcon
{
    public const DEFAULT = 'bookmark';

    /**
     * Keep in step with LIST_ICONS in resources/js/MiniApps/Corner/lib/list-icons.ts, which
     * draws them. A key the page doesn't know falls back to the default there.
     */
    public const KEYS = [
        'music', 'film', 'tv', 'book', 'map-pin', 'compass', 'plane', 'tent',
        'utensils', 'chef-hat', 'coffee', 'wine', 'dice', 'gamepad', 'puzzle', 'palette',
        'camera', 'gift', 'shopping-bag', 'dumbbell', 'trees', 'paw', 'star', 'bookmark',
    ];
}
