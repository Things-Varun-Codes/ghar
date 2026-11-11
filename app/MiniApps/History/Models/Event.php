<?php

namespace App\MiniApps\History\Models;

use App\Shell\Models\User;
use Carbon\CarbonInterface;
use Database\Factories\EventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\File;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

/**
 * @property int $id
 * @property CarbonInterface $occurred_on
 * @property string|null $title
 * @property string|null $location_freetext Backfill column for legacy free-text entries
 * @property string|null $location_place_id Google Places stable ID
 * @property string|null $location_name e.g. "Sydney Opera House"
 * @property string|null $location_address e.g. "Bennelong Point, Sydney NSW 2000"
 * @property string|null $location_lat decimal(10,7); cast to string by Laravel, exposed as float by EventResource
 * @property string|null $location_lng decimal(10,7); cast to string by Laravel, exposed as float by EventResource
 * @property string|null $body_html
 * @property int|null $creator_id
 * @property CarbonInterface $created_at
 * @property CarbonInterface $updated_at
 * @property CarbonInterface|null $deleted_at
 */
#[Fillable([
    'occurred_on',
    'title',
    'location_freetext',
    'location_place_id',
    'location_name',
    'location_address',
    'location_lat',
    'location_lng',
    'body_html',
    'creator_id',
])]
class Event extends Model implements HasMedia
{
    use HasFactory;
    use InteractsWithMedia;
    use SoftDeletes;

    protected $table = 'our_history_events';

    protected static function newFactory(): EventFactory
    {
        return EventFactory::new();
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'occurred_on' => 'date',
            'deleted_at' => 'datetime',
            'location_lat' => 'decimal:7',
            'location_lng' => 'decimal:7',
        ];
    }

    /**
     * booted(), not boot(): it runs after the traits' boot methods, so SoftDeletes and
     * InteractsWithMedia are wired up first.
     */
    protected static function booted(): void
    {
        static::forceDeleting(function (Event $event): void {
            // One at a time so Spatie's observer fires per row and purges the stored files.
            $event->media->each(fn (Media $m) => $m->delete());
        });
    }

    public function registerMediaCollections(): void
    {
        // medialibrary sniffs the real type with finfo, which reports application/x-empty for
        // 0-byte fakes in tests.
        $isEmpty = static fn (File $file): bool => $file->size === 0;

        $photoMimeAllowlist = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heic',
            'image/heif',
        ];

        $this->addMediaCollection('photos')
            ->useDisk(config('shell.media_disk'))
            ->acceptsFile(function (File $file) use ($photoMimeAllowlist, $isEmpty) {
                return $isEmpty($file) || in_array($file->mimeType, $photoMimeAllowlist, true);
            });

        $videoMimeAllowlist = [
            'video/mp4',
            'video/quicktime',
            'video/webm',
        ];

        $this->addMediaCollection('videos')
            ->useDisk(config('shell.media_disk'))
            ->acceptsFile(function (File $file) use ($videoMimeAllowlist, $isEmpty) {
                return $isEmpty($file) || in_array($file->mimeType, $videoMimeAllowlist, true);
            });

        $this->addMediaCollection('video-posters')
            ->useDisk(config('shell.media_disk'))
            ->acceptsFile(function (File $file) use ($isEmpty) {
                return $isEmpty($file) || str_starts_with($file->mimeType, 'image/');
            });
    }

    /**
     * Queued: a GD WebP encode of a large iPhone photo decodes the whole image and overran
     * php-fpm's memory limit when run synchronously.
     */
    public function registerMediaConversions(?Media $media = null): void
    {
        $this->addMediaConversion('thumb')
            ->fit(Fit::Crop, 200, 200)
            ->format('webp')
            ->queued();

        $this->addMediaConversion('medium')
            ->fit(Fit::Max, 1200, 1200)
            ->format('webp')
            ->queued();
    }

    public function changes(): HasMany
    {
        return $this->hasMany(EventChange::class, 'event_id')->orderByDesc('created_at');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }
}
