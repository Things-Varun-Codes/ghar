<?php

namespace App\MiniApps\Mailbox\Actions;

use App\MiniApps\Mailbox\Http\Requests\IssueCitationRequest;
use App\MiniApps\Mailbox\Http\Requests\IssueCouponRequest;
use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Support\MailboxPush;
use App\Shell\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * One row per recipient, all in one transaction; each recipient is pushed only their own.
 *
 * @template TEntry of Citation|Coupon
 */
abstract class IssueToEachRecipient
{
    public function __construct(
        private readonly MailboxPush $push,
    ) {}

    /**
     * @param  array<string, mixed>  $validated
     * @return TEntry
     */
    abstract protected function issueOne(array $validated, User $issuer, int $recipientId): Citation|Coupon;

    /** @return array{0: string, 1: string} the entry type and the push text after the issuer's first name */
    abstract protected function pushNotice(): array;

    /** @return Collection<int, TEntry> */
    protected function issue(IssueCitationRequest|IssueCouponRequest $request, User $issuer): Collection
    {
        $validated = $request->validated();
        $recipientIds = $request->recipientIds();

        /** @var Collection<int, TEntry> $entries */
        $entries = DB::transaction(fn (): Collection => collect($recipientIds)->map(
            fn (int $recipientId): Citation|Coupon => $this->issueOne($validated, $issuer, $recipientId),
        ));

        [$type, $text] = $this->pushNotice();
        $firstName = $issuer->firstName();

        foreach ($entries as $entry) {
            $this->push->toEntry(
                [$entry->loadMissing('recipient')->recipient],
                $type,
                $entry->id,
                "{$firstName} {$text}",
            );
        }

        return $entries;
    }
}
