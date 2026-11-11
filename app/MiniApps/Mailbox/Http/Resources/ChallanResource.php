<?php

namespace App\MiniApps\Mailbox\Http\Resources;

use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;

/**
 * `available_actions` is the only source of action legality the client uses.
 */
class ChallanResource
{
    /** @return array<string, mixed> */
    public function __invoke(Challan $challan): array
    {
        /** @var User|null $viewer */
        $viewer = auth()->user();

        return [
            'id' => $challan->id,
            'ref_no' => $challan->ref_no,
            'status' => $challan->status,
            'offence' => $challan->offence,
            'incident_date' => $challan->incident_date?->toDateString(),
            'incident_place' => $challan->incident_place,
            'is_repeat' => (bool) $challan->is_repeat,
            'penalty' => $challan->penalty,
            'remarks' => $challan->remarks,
            'issued_at' => $challan->issued_at->toIso8601String(),
            'issued_at_human' => $challan->issued_at->diffForHumans(),
            'settled_at' => $challan->settled_at?->toIso8601String(),
            'is_mine' => $viewer !== null && $challan->issuer_id === $viewer->id,
            'issuer' => [
                'id' => $challan->issuer->id,
                'name' => $challan->issuer->name,
            ],
            'recipient' => [
                'id' => $challan->recipient->id,
                'name' => $challan->recipient->name,
            ],
            'available_actions' => $this->availableActionsFor($challan, $viewer),
        ];
    }

    /** @return list<string> */
    private function availableActionsFor(Challan $challan, ?User $viewer): array
    {
        if ($viewer === null) {
            return [];
        }

        return collect(['pay', 'delete'])
            ->filter(fn (string $ability) => $viewer->can($ability, $challan))
            ->values()
            ->all();
    }
}
