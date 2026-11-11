<?php

namespace App\Shell\Models;

use Database\Factories\ShortLinkFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

/**
 * `code` stays out of Fillable and every validator: a written NFC tag is locked read-only,
 * so its URL can never change. Repointing `destination` is the fix.
 */
#[Fillable(['label', 'destination', 'enabled'])]
class ShortLink extends Model
{
    /** @use HasFactory<ShortLinkFactory> */
    use HasFactory;

    protected static function newFactory(): Factory
    {
        return ShortLinkFactory::new();
    }

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Lowercase and unambiguous: the redirect lowercases incoming codes, because phones
     * auto-capitalise.
     */
    public static function generateCode(int $length = 8): string
    {
        $alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
        $max = strlen($alphabet) - 1;

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $code = '';
            for ($i = 0; $i < $length; $i++) {
                $code .= $alphabet[random_int(0, $max)];
            }

            if (! static::where('code', $code)->exists()) {
                return $code;
            }
        }

        throw new RuntimeException('Could not generate a unique short link code after 10 attempts.');
    }
}
