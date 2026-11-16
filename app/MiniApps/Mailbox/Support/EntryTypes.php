<?php

namespace App\MiniApps\Mailbox\Support;

use App\Shell\Services\Rooms;

/**
 * The four kinds of mail. The admin can turn each off while Mailbox stays on; its rows are
 * kept. Routes are gated by `room:our-mailbox,{type}`; anything that reads across types (the
 * landing, Home's door) asks here.
 */
final class EntryTypes
{
    public const ROOM = 'our-mailbox';

    public const MESSAGES = 'messages';

    public const FLOWERS = 'flowers';

    public const COUPONS = 'coupons';

    public const CITATIONS = 'citations';

    /** Landing order. */
    private const LABELS = [
        self::MESSAGES => ['Notes', 'Short handwritten notes to one or more people.'],
        self::FLOWERS => ['Flowers', 'A painted bouquet with a line to go with it.'],
        self::CITATIONS => ['Citations', 'Joke tickets for household offences, to be paid in kind.'],
        self::COUPONS => ['Coupons', 'Favours to give and redeem.'],
    ];

    public static function register(Rooms $rooms): void
    {
        foreach (self::LABELS as $type => [$label, $description]) {
            $rooms->registerOption(self::ROOM, $type, $label, $description);
        }
    }

    public static function on(string $type): bool
    {
        return app(Rooms::class)->optionOn(self::ROOM, $type);
    }

    /** @return list<string> */
    public static function enabled(): array
    {
        return array_values(array_filter(array_keys(self::LABELS), self::on(...)));
    }
}
