<?php

namespace App\MiniApps\Mailbox\Models;

use App\MiniApps\Mailbox\Models\Concerns\IssuedToOne;
use App\Shell\Models\User;
use Carbon\CarbonImmutable;
use Database\Factories\CitationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
class Citation extends Model
{
    use HasFactory;
    use IssuedToOne;

    public const STATUS_ISSUED = 'issued';

    public const STATUS_PAID = 'paid';

    protected $table = 'mailbox_citations';

    protected static function newFactory(): CitationFactory
    {
        return CitationFactory::new();
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
