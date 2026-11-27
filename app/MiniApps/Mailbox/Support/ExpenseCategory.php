<?php

namespace App\MiniApps\Mailbox\Support;

/**
 * What an expense was for. The page draws each with its lucide icon and suggests one from the
 * title through whatcategory, which matches the emoji and words against its open data. The
 * emoji and words were measured on labelled household titles: change them only with a
 * before-and-after run, since a word that reads better can match worse.
 * A key is stored on the expense, so never rename one.
 */
enum ExpenseCategory: string
{
    case EatingOut = 'eating-out';
    case Groceries = 'groceries';
    case Drinks = 'drinks';
    case Shopping = 'shopping';
    case Rent = 'rent';
    case Electricity = 'electricity';
    case Gas = 'gas';
    case Internet = 'internet';
    case Phone = 'phone';
    case Subscriptions = 'subscriptions';
    case Repairs = 'repairs';
    case Furniture = 'furniture';
    case Taxis = 'taxis';
    case Fuel = 'fuel';
    case Buses = 'buses';
    case Trains = 'trains';
    case Flights = 'flights';
    case Stays = 'stays';
    case Entertainment = 'entertainment';
    case Cinema = 'cinema';
    case Medicine = 'medicine';
    case School = 'school';
    case Gifts = 'gifts';
    case Bills = 'bills';

    public function label(): string
    {
        return match ($this) {
            self::EatingOut => 'Eating out',
            self::Phone => 'Phone',
            default => ucfirst($this->value),
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::EatingOut => 'utensils-crossed',
            self::Groceries => 'shopping-basket',
            self::Drinks => 'beer',
            self::Shopping => 'shopping-bag',
            self::Rent => 'house',
            self::Electricity => 'plug-zap',
            self::Gas => 'flame',
            self::Internet => 'wifi',
            self::Phone => 'smartphone',
            self::Subscriptions => 'tv',
            self::Repairs => 'wrench',
            self::Furniture => 'sofa',
            self::Taxis => 'car-taxi-front',
            self::Fuel => 'fuel',
            self::Buses => 'bus',
            self::Trains => 'train-front',
            self::Flights => 'plane',
            self::Stays => 'bed-double',
            self::Entertainment => 'ticket',
            self::Cinema => 'clapperboard',
            self::Medicine => 'pill',
            self::School => 'graduation-cap',
            self::Gifts => 'gift',
            // Not the receipt, which is what an expense with no category shows.
            self::Bills => 'file-text',
        };
    }

    /** @return array{emoji: string, words: list<string>} */
    private function match(): array
    {
        return match ($this) {
            self::EatingOut => ['emoji' => '🍴', 'words' => ['Restaurant', 'Cafe']],
            // 🥕, not 🛒: the cart shares its words with Shopping.
            self::Groceries => ['emoji' => '🥕', 'words' => ['Groceries']],
            self::Drinks => ['emoji' => '🍺', 'words' => ['Drinks']],
            self::Shopping => ['emoji' => '🛍️', 'words' => ['Shopping']],
            self::Rent => ['emoji' => '🏠', 'words' => ['Rent']],
            self::Electricity => ['emoji' => '🔌', 'words' => ['Electricity']],
            self::Gas => ['emoji' => '🔥', 'words' => ['Gas']],
            self::Internet => ['emoji' => '🛜', 'words' => ['Internet']],
            self::Phone => ['emoji' => '📱', 'words' => ['Recharge']],
            self::Subscriptions => ['emoji' => '📺', 'words' => ['Subscriptions']],
            self::Repairs => ['emoji' => '🔧', 'words' => ['Repairs']],
            self::Furniture => ['emoji' => '🛋️', 'words' => ['Furniture']],
            self::Taxis => ['emoji' => '🚕', 'words' => ['Taxis']],
            self::Fuel => ['emoji' => '⛽', 'words' => ['Petrol']],
            self::Buses => ['emoji' => '🚌', 'words' => ['Buses']],
            self::Trains => ['emoji' => '🚆', 'words' => ['Train']],
            self::Flights => ['emoji' => '✈️', 'words' => ['Flights']],
            self::Stays => ['emoji' => '🛏️', 'words' => ['Stays']],
            self::Entertainment => ['emoji' => '🎟️', 'words' => ['Entertainment']],
            self::Cinema => ['emoji' => '🎬', 'words' => ['Cinema']],
            // The emoji alone: a word here pulled in more wrong matches than right ones.
            self::Medicine => ['emoji' => '💊', 'words' => []],
            self::School => ['emoji' => '🏫', 'words' => ['School']],
            self::Gifts => ['emoji' => '🎁', 'words' => ['Gifts']],
            // Keeps "Electricity bill" and "Restaurant bill" from being pulled elsewhere.
            self::Bills => ['emoji' => '🧾', 'words' => ['Bills']],
        };
    }

    /** @return list<array{key: string, label: string, icon: string, emoji: string, words: list<string>}> */
    public static function forPage(): array
    {
        return array_map(
            fn (self $category): array => ['key' => $category->value, 'label' => $category->label(), 'icon' => $category->icon(), ...$category->match()],
            self::cases(),
        );
    }
}
