<?php

namespace App\Shell\Actions;

use App\Shell\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Image\Enums\Fit;
use Spatie\Image\Image;
use Throwable;

/**
 * A person's picture on the media disk. The upload is drawn again as a square WebP, so what is
 * stored is always a small image the page can show, and nothing from the camera (location,
 * device) survives in it.
 */
class ProfilePicture
{
    public const SIZE = 512;

    public const MAX_KILOBYTES = 10240;

    /** @var list<string> */
    public const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    public function replace(User $user, UploadedFile $upload): void
    {
        $previous = $user->avatar_key;
        $key = 'avatars/'.Str::uuid().'.webp';

        $scratch = (string) tempnam(sys_get_temp_dir(), 'avatar');
        $encoded = $scratch.'.webp';

        try {
            try {
                Image::load((string) $upload->getRealPath())
                    ->fit(Fit::Crop, self::SIZE, self::SIZE)
                    ->format('webp')
                    ->save($encoded);
            } catch (Throwable $e) {
                report($e);

                throw ValidationException::withMessages([
                    'picture' => "That picture couldn't be read. Try another one.",
                ]);
            }

            Storage::disk($this->disk())->put($key, (string) file_get_contents($encoded));
        } finally {
            @unlink($scratch);
            @unlink($encoded);
        }

        $user->forceFill(['avatar_key' => $key])->save();

        $this->deleteObject($previous);
    }

    public function remove(User $user): void
    {
        $previous = $user->avatar_key;

        if ($previous === null) {
            return;
        }

        $user->forceFill(['avatar_key' => null])->save();

        $this->deleteObject($previous);
    }

    public function deleteObject(?string $key): void
    {
        if ($key !== null && $key !== '') {
            Storage::disk($this->disk())->delete($key);
        }
    }

    private function disk(): string
    {
        return config('shell.media_disk');
    }
}
