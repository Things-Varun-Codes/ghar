<?php

namespace App\Shell\Support;

/**
 * An icon a person picks (a list's, an expense's) is a lucide icon name. lucide-icon-names.json
 * is written by scripts/lucide-icons.mjs from the installed lucide-react, so the server accepts
 * exactly what the page can draw.
 */
final class LucideIcon
{
    /** @var array<string, true>|null */
    private static ?array $names = null;

    public static function isValid(string $name): bool
    {
        self::$names ??= array_fill_keys(
            json_decode((string) file_get_contents(__DIR__.'/lucide-icon-names.json'), true),
            true,
        );

        return isset(self::$names[$name]);
    }
}
