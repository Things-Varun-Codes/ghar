<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Http\Requests\IssueCitationRequest;
use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Support\EntryTypes;
use App\Shell\Models\User;
use Illuminate\Support\Collection;

/** @extends IssueToEachRecipient<Citation> */
class IssueCitation extends IssueToEachRecipient
{
    /** @return Collection<int, Citation> */
    public function __invoke(IssueCitationRequest $request, User $issuer): Collection
    {
        return $this->issue($request, $issuer);
    }

    protected function pushNotice(): array
    {
        return [EntryTypes::CITATIONS, 'issued you a citation'];
    }

    /** @param  array<string, mixed>  $validated */
    protected function issueOne(array $validated, User $issuer, int $recipientId): Citation
    {
        $citation = new Citation([
            'recipient_id' => $recipientId,
            'offence' => $validated['offence'],
            'incident_date' => $validated['incident_date'] ?? null,
            'incident_place' => $validated['incident_place'] ?? null,
            'is_repeat' => $validated['is_repeat'] ?? false,
            'penalty' => $validated['penalty'],
            'remarks' => $validated['remarks'] ?? null,
        ]);

        $citation->issuer_id = $issuer->id;
        $citation->status = Citation::STATUS_ISSUED;
        $citation->issued_at = now();
        $citation->save();

        $citation->ref_no = sprintf('OC/%d/%06d', $citation->issued_at->year, $citation->id);
        $citation->save();

        return $citation;
    }
}
