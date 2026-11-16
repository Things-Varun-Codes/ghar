<?php

namespace App\MiniApps\Corner\Support;

/**
 * A list's icon is a lucide icon name. icon-names.json is written by
 * scripts/corner-icon-names.mjs from the installed lucide-react, so the server accepts exactly
 * what the page can draw.
 */
final class ListIcon
{
    public const DEFAULT = 'bookmark';

    /** Two names the first icon picker used that lucide spells differently. */
    private const ALIASES = ['dice' => 'dices', 'paw' => 'paw-print'];

    /** @var array<string, true>|null */
    private static ?array $names = null;

    public static function normalise(string $name): string
    {
        $name = strtolower(trim($name));

        return self::ALIASES[$name] ?? $name;
    }

    public static function isValid(string $name): bool
    {
        self::$names ??= array_fill_keys(
            json_decode((string) file_get_contents(__DIR__.'/icon-names.json'), true),
            true,
        );

        return isset(self::$names[self::normalise($name)]);
    }
}
