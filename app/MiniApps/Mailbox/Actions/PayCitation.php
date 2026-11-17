<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Support\EntryTypes;
use App\MiniApps\Mailbox\Support\MailboxPush;
use App\Shell\Models\User;
use Illuminate\Support\Facades\DB;

class PayCitation
{
    public function __construct(
        private readonly MailboxPush $push,
    ) {}

    public function __invoke(Citation $citation, User $actor): Citation
    {
        // Locked and re-checked so a double submit can't push twice.
        $citation = DB::transaction(function () use ($citation): Citation {
            $locked = Citation::query()->whereKey($citation->id)->lockForUpdate()->firstOrFail();

            abort_unless($locked->status === Citation::STATUS_ISSUED, 422, 'This citation has already been paid.');

            $locked->status = Citation::STATUS_PAID;
            $locked->settled_at = now();
            $locked->save();

            return $locked;
        });

        $firstName = $actor->firstName();

        $this->push->toEntry(
            [$citation->loadMissing('issuer')->issuer],
            EntryTypes::CITATIONS,
            $citation->id,
            "{$firstName} paid your citation",
        );

        return $citation;
    }
}
