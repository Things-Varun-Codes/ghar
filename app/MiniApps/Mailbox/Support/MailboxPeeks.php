<?php

namespace App\MiniApps\Mailbox\Support;

use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\User;
use App\Shell\Services\Household;
use App\Shell\Support\SignedUrls;
use Illuminate\Support\Str;
use Throwable;

/**
 * One object per door on the Mailbox landing. Notes and flowers come only from what the viewer
 * received; citations and coupons only from what they issued or received, preferring the one
 * waiting on them. Showing a note or bouquet here doesn't mark it read. An entry type that is off
 * has no peek.
 */
final class MailboxPeeks
{
    private const NOTE_LIMIT = 140;

    public function __construct(private readonly SignedUrls $signedUrls) {}

    /**
     * @return array{
     *     notes: array{body: string, from: string}|null,
     *     flowers: array{image_url: string, from: string}|null,
     *     citations: array{ref_no: ?string, status: string, offence: string, issuer: string, recipient: string}|null,
     *     coupons: array{title: string, remaining: int, quantity: int, status: string, is_expired: bool, issuer: string, recipient: string}|null,
     * }
     */
    public function forUser(User $user): array
    {
        return [
            'notes' => self::latestNote($user),
            'flowers' => EntryTypes::on(EntryTypes::FLOWERS) ? $this->bouquet($user) : null,
            'citations' => EntryTypes::on(EntryTypes::CITATIONS) ? $this->citation($user) : null,
            'coupons' => EntryTypes::on(EntryTypes::COUPONS) ? $this->coupon($user) : null,
        ];
    }

    /**
     * The newest note the viewer received, trimmed for a glimpse. Also Home's Mailbox door.
     *
     * @return array{body: string, from: string}|null
     */
    public static function latestNote(User $user): ?array
    {
        if (! EntryTypes::on(EntryTypes::MESSAGES)) {
            return null;
        }

        $note = MailboxMessage::query()
            ->receivedBy($user)
            ->with('sender')
            ->orderByDesc('posted_at')
            ->orderByDesc('id')
            ->first();

        if ($note === null || trim((string) $note->body) === '') {
            return null;
        }

        return [
            'body' => Str::limit(trim((string) $note->body), self::NOTE_LIMIT),
            'from' => app(Household::class)->shortName($note->sender),
        ];
    }

    /** @return array{image_url: string, from: string}|null */
    private function bouquet(User $user): ?array
    {
        $bouquet = Bouquet::query()
            ->receivedBy($user)
            ->with('sender')
            ->orderByDesc('posted_at')
            ->orderByDesc('id')
            ->first();

        if ($bouquet === null) {
            return null;
        }

        // A storage misconfiguration costs the peek, not the whole landing.
        try {
            $url = $this->signedUrls->forDiskObject(config('services.bouquet.disk'), $bouquet->image_key);
        } catch (Throwable $e) {
            report($e);

            return null;
        }

        return [
            'image_url' => $url,
            'from' => app(Household::class)->shortName($bouquet->sender),
        ];
    }

    /**
     * The fields the citation list already shows this viewer, and no more.
     *
     * @return array{ref_no: ?string, status: string, offence: string, issuer: string, recipient: string}|null
     */
    private function citation(User $user): ?array
    {
        $citation = Citation::query()
            ->visibleTo($user)
            ->with(['issuer', 'recipient'])
            ->orderByRaw(
                'case when recipient_id = ? and status = ? then 0 when recipient_id = ? then 1 else 2 end',
                [$user->id, Citation::STATUS_ISSUED, $user->id],
            )
            ->orderByDesc('issued_at')
            ->orderByDesc('id')
            ->first();

        if ($citation === null) {
            return null;
        }

        return [
            'ref_no' => $citation->ref_no,
            'status' => $citation->status,
            'offence' => $citation->offence,
            'issuer' => app(Household::class)->shortName($citation->issuer),
            'recipient' => app(Household::class)->shortName($citation->recipient),
        ];
    }

    /** @return array{title: string, remaining: int, quantity: int, status: string, is_expired: bool, issuer: string, recipient: string}|null */
    private function coupon(User $user): ?array
    {
        $coupon = Coupon::query()
            ->visibleTo($user)
            ->with(['issuer', 'recipient'])
            ->orderByRaw(
                'case when issuer_id = ? and status = ? then 0 when recipient_id = ? and status <> ? then 1 when recipient_id = ? then 2 else 3 end',
                [$user->id, Coupon::STATUS_REQUESTED, $user->id, Coupon::STATUS_DEPLETED, $user->id],
            )
            ->orderByDesc('issued_at')
            ->orderByDesc('id')
            ->first();

        if ($coupon === null) {
            return null;
        }

        return [
            'title' => $coupon->title,
            'remaining' => $coupon->remaining(),
            'quantity' => $coupon->quantity,
            'status' => $coupon->status,
            'is_expired' => $coupon->isExpired(),
            'issuer' => app(Household::class)->shortName($coupon->issuer),
            'recipient' => app(Household::class)->shortName($coupon->recipient),
        ];
    }
}
