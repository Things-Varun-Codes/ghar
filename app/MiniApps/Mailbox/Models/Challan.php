<?php

namespace App\MiniApps\Mailbox\Models;

use App\Shell\Models\User;
use Carbon\CarbonImmutable;
use Database\Factories\ChallanFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $issuer_id
 * @property int $recipient_id
 * @property string $ref_no
 * @property string $offence
 * @property Carbon|null $incident_date
 * @property string|null $incident_place
 * @property bool $is_repeat
 * @property string $penalty
 * @property string|null $remarks
 * @property string $status
 * @property CarbonImmutable|null $settled_at
 * @property CarbonImmutable $issued_at
 * @property-read User $issuer
 * @property-read User $recipient
 */
#[Fillable([
    'recipient_id',
    'offence',
    'incident_date',
    'incident_place',
    'is_repeat',
    'penalty',
    'remarks',
])]
class Challan extends Model
{
    use HasFactory;

    public const STATUS_ISSUED = 'issued';

    public const STATUS_PAID = 'paid';

    protected $table = 'mailbox_challans';

    public function scopeVisibleTo(Builder $query, User $viewer): Builder
    {
        return $query->where(fn (Builder $q) => $q
            ->where('issuer_id', $viewer->id)
            ->orWhere('recipient_id', $viewer->id));
    }

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issuer_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    protected static function newFactory(): ChallanFactory
    {
        return ChallanFactory::new();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'incident_date' => 'date',
            'is_repeat' => 'boolean',
            'issued_at' => 'immutable_datetime',
            'settled_at' => 'immutable_datetime',
        ];
    }
}
