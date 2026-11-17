<?php

namespace Tests\Feature\Corner\Concerns;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\Shell\Models\User;
use InvalidArgumentException;
use Tests\Feature\Shell\Concerns\FakesPublicDns;

trait MakesCornerLists
{
    use FakesPublicDns;

    /** The four lists an upgraded install has. */
    protected function songs(): CornerList
    {
        return CornerList::factory()->songs()->create(['position' => 0]);
    }

    protected function movies(): CornerList
    {
        return CornerList::factory()->movies()->create(['position' => 1]);
    }

    protected function activities(): CornerList
    {
        return CornerList::factory()->activities()->create(['position' => 2]);
    }

    protected function places(): CornerList
    {
        return CornerList::factory()->places()->create(['position' => 3]);
    }

    protected function listCalled(string $slug): CornerList
    {
        return match ($slug) {
            'songs' => $this->songs(),
            'movies' => $this->movies(),
            'activities' => $this->activities(),
            'places' => $this->places(),
            default => throw new InvalidArgumentException("No list called {$slug}."),
        };
    }

    /**
     * An item shaped like the ones its list usually holds: a link with a picture in Songs and
     * Movies, a place in Places, a bare name anywhere else.
     *
     * @param  array<string, mixed>  $attributes
     */
    protected function itemIn(CornerList $list, User $adder, array $attributes = []): Item
    {
        $factory = Item::factory();
        $factory = match ($list->slug) {
            'songs', 'movies' => $factory->link()->picture(),
            'places' => $factory->place(),
            default => $factory,
        };

        return $factory->create(['list_id' => $list->id, 'added_by_user_id' => $adder->id] + $attributes);
    }
}
