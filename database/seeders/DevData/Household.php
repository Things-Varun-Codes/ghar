<?php

namespace Database\Seeders\DevData;

use App\Shell\Models\User;
use Carbon\CarbonImmutable;
use Faker\Generator;
use Illuminate\Support\Facades\Storage;

/**
 * The sample household and the helpers its per-app data shares.
 */
final class Household
{
    public const FILES_DIRECTORY = 'dev-seed';

    public function __construct(
        public readonly User $admin,
        public readonly User $ravi,
        public readonly User $meera,
        public readonly User $kabir,
        public readonly CarbonImmutable $today,
        public readonly Generator $faker,
    ) {}

    /**
     * @return list<User>
     */
    public function members(): array
    {
        return [$this->admin, $this->ravi, $this->meera, $this->kabir];
    }

    public function daysAgo(int $days, int $hour = 18): CarbonImmutable
    {
        return $this->today->subDays($days)->setTime($hour, 30);
    }

    /**
     * Store a drawn image on the local media disk and return its object key.
     */
    public function storeImage(string $name, string $bytes): string
    {
        $key = ltrim(trim((string) config('media-library.prefix'), '/').'/'.self::FILES_DIRECTORY.'/'.$name, '/');

        Storage::disk('local')->put($key, $bytes);

        return $key;
    }
}
