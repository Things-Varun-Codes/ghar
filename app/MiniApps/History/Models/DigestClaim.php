<?php

namespace App\MiniApps\History\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * A household day whose morning digest is claimed: the unique `day` is the lock.
 *
 * @property int $id
 * @property CarbonInterface $day
 * @property CarbonInterface $claimed_at
 */
#[Fillable(['day', 'claimed_at'])]
class DigestClaim extends Model
{
    public $timestamps = false;

    protected $table = 'our_history_digest_claims';

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'day' => 'date',
            'claimed_at' => 'datetime',
        ];
    }
}
