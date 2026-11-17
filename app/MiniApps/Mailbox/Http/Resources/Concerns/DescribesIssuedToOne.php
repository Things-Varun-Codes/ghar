<?php

namespace App\MiniApps\Mailbox\Http\Resources\Concerns;

use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\Shell\Models\User;

/**
 * `available_actions` is the only source of action legality the client uses.
 */
trait DescribesIssuedToOne
{
    /**
     * @param  list<string>  $abilities
     * @return array{is_mine: bool, issuer: array{id: int, name: string}, recipient: array{id: int, name: string}, available_actions: list<string>}
     */
    private function parties(Citation|Coupon $entry, ?User $viewer, array $abilities): array
    {
        return [
            'is_mine' => $viewer !== null && $entry->issuer_id === $viewer->id,
            'issuer' => [
                'id' => $entry->issuer->id,
                'name' => $entry->issuer->name,
            ],
            'recipient' => [
                'id' => $entry->recipient->id,
                'name' => $entry->recipient->name,
            ],
            'available_actions' => $viewer === null
                ? []
                : array_values(array_filter($abilities, fn (string $ability) => $viewer->can($ability, $entry))),
        ];
    }
}
