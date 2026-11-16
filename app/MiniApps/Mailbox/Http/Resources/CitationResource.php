<?php

namespace App\MiniApps\Mailbox\Http\Resources;

use App\MiniApps\Mailbox\Models\Citation;
use App\Shell\Models\User;

/**
 * `available_actions` is the only source of action legality the client uses.
 */
class CitationResource
{
    /** @return array<string, mixed> */
    public function __invoke(Citation $citation): array
    {
        /** @var User|null $viewer */
        $viewer = auth()->user();

        return [
            'id' => $citation->id,
            'ref_no' => $citation->ref_no,
            'status' => $citation->status,
            'offence' => $citation->offence,
            'incident_date' => $citation->incident_date?->toDateString(),
            'incident_place' => $citation->incident_place,
            'is_repeat' => (bool) $citation->is_repeat,
            'penalty' => $citation->penalty,
            'remarks' => $citation->remarks,
            'issued_at' => $citation->issued_at->toIso8601String(),
            'issued_at_human' => $citation->issued_at->diffForHumans(),
            'settled_at' => $citation->settled_at?->toIso8601String(),
            'is_mine' => $viewer !== null && $citation->issuer_id === $viewer->id,
            'issuer' => [
                'id' => $citation->issuer->id,
                'name' => $citation->issuer->name,
            ],
            'recipient' => [
                'id' => $citation->recipient->id,
                'name' => $citation->recipient->name,
            ],
            'available_actions' => $this->availableActionsFor($citation, $viewer),
        ];
    }

    /** @return list<string> */
    private function availableActionsFor(Citation $citation, ?User $viewer): array
    {
        if ($viewer === null) {
            return [];
        }

        return collect(['pay', 'delete'])
            ->filter(fn (string $ability) => $viewer->can($ability, $citation))
            ->values()
            ->all();
    }
}
