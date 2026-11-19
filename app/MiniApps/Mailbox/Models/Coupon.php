<?php

namespace App\MiniApps\Mailbox\Models;

use App\MiniApps\Mailbox\Models\Concerns\IssuedToOne;
use App\Shell\Models\User;
use App\Shell\Support\Region;
use Carbon\CarbonImmutable;
use Database\Factories\CouponFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $issuer_id
 * @property int $recipient_id
 * @property string $code
 * @property string $title
 * @property string|null $description
 * @property int $quantity
 * @property int $redeemed_count
 * @property Carbon|null $expires_at
 * @property string $status
 * @property CarbonImmutable|null $requested_at
 * @property CarbonImmutable $issued_at
 * @property CarbonImmutable|null $last_fulfilled_at
 * @property-read User $issuer
 * @property-read User $recipient
 */
#[Fillable([
    'recipient_id',
    'title',
    'description',
    'quantity',
    'expires_at',
])]
class Coupon extends Model
{
    use HasFactory;
    use IssuedToOne;

    public const STATUS_ISSUED = 'issued';

    public const STATUS_REQUESTED = 'requested';

    public const STATUS_DEPLETED = 'depleted';

    protected $table = 'mailbox_coupons';

    public function remaining(): int
    {
        return $this->quantity - $this->redeemed_count;
    }

    public function hasPendingRequest(): bool
    {
        return $this->status === self::STATUS_REQUESTED;
    }

    /**
     * Valid through its last day on the household's calendar. `expires_at` is a plain date, so it
     * is compared as one: a Carbon comparison would put it at midnight on the server's clock.
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null
            && $this->expires_at->toDateString() < Region::today()->toDateString();
    }

    protected static function newFactory(): CouponFactory
    {
        return CouponFactory::new();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'redeemed_count' => 'integer',
            'expires_at' => 'date',
            'requested_at' => 'immutable_datetime',
            'issued_at' => 'immutable_datetime',
            'last_fulfilled_at' => 'immutable_datetime',
        ];
    }
}
