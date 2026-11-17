<?php

namespace App\MiniApps\Mailbox\Http\Resources;

use App\MiniApps\Mailbox\Http\Resources\Concerns\DescribesIssuedToOne;
use App\MiniApps\Mailbox\Models\Citation;
use App\Shell\Models\User;

class CitationResource
{
    use DescribesIssuedToOne;

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
            ...$this->parties($citation, $viewer, ['pay', 'delete']),
        ];
    }
}
