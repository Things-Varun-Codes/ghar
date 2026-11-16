<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Http\Requests\IssueCitationRequest;
use App\MiniApps\Mailbox\Models\Citation;
use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class IssueCitation
{
    public function __construct(
        private readonly PushDispatcher $dispatcher,
    ) {}

    /** @return Collection<int, Citation> */
    public function __invoke(IssueCitationRequest $request, User $issuer): Collection
    {
        $validated = $request->validated();
        $recipientIds = $request->recipientIds();

        /** @var Collection<int, Citation> $citations */
        $citations = DB::transaction(fn (): Collection => collect($recipientIds)->map(
            fn (int $recipientId): Citation => $this->issueOne($validated, $issuer, $recipientId),
        ));

        $firstName = $issuer->firstName();

        foreach ($citations as $citation) {
            $this->dispatcher->toUsers(
                [$citation->loadMissing('recipient')->recipient],
                'our-mailbox',
                'our-mailbox:citations',
                "{$firstName} issued you a citation",
                "/apps/our-mailbox/citations/{$citation->id}",
            );
        }

        return $citations;
    }

    /** @param  array<string, mixed>  $validated */
    private function issueOne(array $validated, User $issuer, int $recipientId): Citation
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
