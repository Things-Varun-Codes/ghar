<?php

namespace App\MiniApps\Corner\Support;

/**
 * What an item in a list is, which decides how it looks and what it can hold. Fixed once the
 * list exists: a place has no link to show in a CD frame.
 */
enum ListKind: string
{
    case Link = 'link';
    case Poster = 'poster';
    case Place = 'place';
    case Plain = 'plain';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** @return list<string> the columns a search looks in */
    public function searchColumns(): array
    {
        return match ($this) {
            self::Link => ['title', 'author', 'notes'],
            self::Place => ['title', 'address', 'notes'],
            self::Poster, self::Plain => ['title', 'notes'],
        };
    }

    public function hasArtwork(): bool
    {
        return $this === self::Link || $this === self::Poster;
    }
}
