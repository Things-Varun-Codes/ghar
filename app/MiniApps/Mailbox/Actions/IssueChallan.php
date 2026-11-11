<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Http\Requests\IssueChallanRequest;
use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class IssueChallan
{
    public function __construct(
        private readonly PushDispatcher $dispatcher,
    ) {}

    /** @return Collection<int, Challan> */
    public function __invoke(IssueChallanRequest $request, User $issuer): Collection
    {
        $validated = $request->validated();
        $recipientIds = $request->recipientIds();

        /** @var Collection<int, Challan> $challans */
        $challans = DB::transaction(fn (): Collection => collect($recipientIds)->map(
            fn (int $recipientId): Challan => $this->issueOne($validated, $issuer, $recipientId),
        ));

        $firstName = $issuer->firstName();

        foreach ($challans as $challan) {
            $this->dispatcher->toUsers(
                [$challan->loadMissing('recipient')->recipient],
                'our-mailbox',
                'our-mailbox:challans',
                "{$firstName} issued you a citation",
                "/apps/our-mailbox/challans/{$challan->id}",
            );
        }

        return $challans;
    }

    /** @param  array<string, mixed>  $validated */
    private function issueOne(array $validated, User $issuer, int $recipientId): Challan
    {
        $challan = new Challan([
            'recipient_id' => $recipientId,
            'offence' => $validated['offence'],
            'incident_date' => $validated['incident_date'] ?? null,
            'incident_place' => $validated['incident_place'] ?? null,
            'is_repeat' => $validated['is_repeat'] ?? false,
            'penalty' => $validated['penalty'],
            'remarks' => $validated['remarks'] ?? null,
        ]);

        $challan->issuer_id = $issuer->id;
        $challan->status = Challan::STATUS_ISSUED;
        $challan->issued_at = now();
        $challan->save();

        $challan->ref_no = sprintf('OC/%d/%06d', $challan->issued_at->year, $challan->id);
        $challan->save();

        return $challan;
    }
}
