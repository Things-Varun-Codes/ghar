<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Models\Challan;
use App\Shell\Models\User;
use App\Shell\Services\PushDispatcher;
use Illuminate\Support\Facades\DB;

class PayChallan
{
    public function __construct(
        private readonly PushDispatcher $dispatcher,
    ) {}

    public function __invoke(Challan $challan, User $actor): Challan
    {
        // Locked and re-checked so a double submit can't push twice.
        $challan = DB::transaction(function () use ($challan): Challan {
            $locked = Challan::query()->whereKey($challan->id)->lockForUpdate()->firstOrFail();

            abort_unless($locked->status === Challan::STATUS_ISSUED, 422, 'This citation can no longer be paid.');

            $locked->status = Challan::STATUS_PAID;
            $locked->settled_at = now();
            $locked->save();

            return $locked;
        });

        $firstName = $actor->firstName();

        $this->dispatcher->toUsers(
            [$challan->loadMissing('issuer')->issuer],
            'our-mailbox',
            'our-mailbox:challans',
            "{$firstName} paid your citation",
            "/apps/our-mailbox/challans/{$challan->id}",
        );

        return $challan;
    }
}
