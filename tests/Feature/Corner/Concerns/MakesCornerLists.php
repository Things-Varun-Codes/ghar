<?php

namespace Tests\Feature\Corner\Concerns;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\ListKind;
use App\Shell\Models\User;

trait MakesCornerLists
{
    /** The four lists an upgraded install has, one of each kind. */
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

    protected function listOfKind(ListKind $kind): CornerList
    {
        return match ($kind) {
            ListKind::Link => $this->songs(),
            ListKind::Poster => $this->movies(),
            ListKind::Plain => $this->activities(),
            ListKind::Place => $this->places(),
        };
    }

    /** @param  array<string, mixed>  $attributes */
    protected function itemIn(CornerList $list, User $adder, array $attributes = []): Item
    {
        $factory = Item::factory();
        $factory = match ($list->kind) {
            ListKind::Link => $factory->link(),
            ListKind::Poster => $factory->poster(),
            ListKind::Place => $factory->place(),
            ListKind::Plain => $factory,
        };

        return $factory->create(['list_id' => $list->id, 'added_by_user_id' => $adder->id] + $attributes);
    }
}
