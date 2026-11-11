<?php

namespace Database\Seeders;

use App\Shell\Models\Invitation;
use App\Shell\Models\ShortLink;
use App\Shell\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DevData\CornerData;
use Database\Seeders\DevData\HistoryData;
use Database\Seeders\DevData\Household;
use Database\Seeders\DevData\MailboxData;
use Faker\Factory as Faker;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * The one sample household every local test uses: `npm run dev-setup`,
 * `npm run dev-reset`, `npm run smoke-mcp` and the smoke harnesses all seed
 * from here. CLAUDE.md "How to test locally" documents the accounts and which
 * to use for what, so change it and this file together.
 *
 * Deterministic on a fresh database: fixed Faker seed, dates relative to today,
 * ids stable because rows are always created in the same order. No network
 * calls; placeholder images are drawn locally.
 */
class DevDataSeeder extends Seeder
{
    public const PASSWORD = 'ghar-local-dev';

    public const ADMIN = 'admin@example.test';

    public const RAVI = 'ravi@example.test';

    public const MEERA = 'meera@example.test';

    public const KABIR = 'kabir@example.test';

    public const INVITE_EMAIL = 'invitee@example.test';

    public const INVITE_TOKEN = 'dev-invite-token-for-local-testing-only';

    private const FAKER_SEED = 20260101;

    public function run(): void
    {
        // A known password must never reach a real database.
        if (! App::environment(['local', 'testing'])) {
            throw new RuntimeException('DevDataSeeder only runs in the local and testing environments.');
        }

        // Anything else would push placeholder files to a real bucket.
        if (config('shell.media_disk') !== 'local') {
            throw new RuntimeException('DevDataSeeder needs MEDIA_DISK=local.');
        }

        if (User::query()->where('email', self::ADMIN)->exists()) {
            $this->command?->warn('The sample household is already seeded. Run `npm run dev-reset` to start over.');

            return;
        }

        // Conversions run now rather than waiting for a worker, so photos are
        // ready the moment seeding ends.
        config([
            'media-library.queue_connection_name' => 'sync',
            'media-library.queue_conversions_after_database_commit' => false,
        ]);

        $this->clearSeededFiles();

        $household = $this->seedHousehold();
        $this->seedShortLinks($household);
        $this->seedInvitation($household);

        $links = $this->appEnabled('our-corner') ? (new CornerData)->seed($household) : [];

        if ($this->appEnabled('our-history')) {
            (new HistoryData)->seed($household, $links);
        }

        if ($this->appEnabled('our-mailbox')) {
            (new MailboxData)->seed($household);
        }
    }

    private function appEnabled(string $slug): bool
    {
        return (bool) (collect(config('miniapps', []))->firstWhere('slug', $slug)['enabled'] ?? false);
    }

    /**
     * The database was just wiped, so files left by the previous seed (or
     * uploaded against it) point at nothing. A harness sets MEDIA_PREFIX and
     * clears only its own folder, leaving the developer's files alone.
     */
    private function clearSeededFiles(): void
    {
        $disk = Storage::disk('local');
        $prefix = trim((string) config('media-library.prefix'), '/');

        if ($prefix !== '') {
            $disk->deleteDirectory($prefix);

            return;
        }

        foreach ($disk->directories() as $directory) {
            if (ctype_digit($directory) || in_array($directory, ['bouquets', Household::FILES_DIRECTORY], true)) {
                $disk->deleteDirectory($directory);
            }
        }
    }

    private function seedHousehold(): Household
    {
        $password = Hash::make(self::PASSWORD);

        $member = fn (string $email, string $name, string $role): User => tap(
            User::factory()->create([
                'email' => $email,
                'name' => $name,
                'password' => $password,
                'remember_token' => null,
            ]),
            fn (User $user) => $user->assignRole($role),
        );

        $faker = Faker::create('en_US');
        $faker->seed(self::FAKER_SEED);

        $household = new Household(
            admin: $member(self::ADMIN, 'Asha Rao', 'admin'),
            ravi: $member(self::RAVI, 'Ravi Rao', 'user'),
            meera: $member(self::MEERA, 'Meera Rao', 'user'),
            kabir: $member(self::KABIR, 'Kabir Rao', 'user'),
            today: CarbonImmutable::now()->startOfDay(),
            faker: $faker,
        );

        // Kabir and the admin stay unsubscribed, so "a member with no device"
        // is covered too. The endpoints can't deliver; they exercise the
        // recipient and subscription-count paths.
        $this->seedPushSubscription($household->ravi);
        $this->seedPushSubscription($household->meera);

        return $household;
    }

    private function seedPushSubscription(User $user): void
    {
        $encode = fn (string $raw): string => rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');

        $user->pushSubscriptions()->create([
            'endpoint' => "https://example.invalid/dev-seed-{$user->id}",
            // Right length for the column, not a usable key.
            'public_key' => $encode(hash_hkdf('sha256', $user->email, 65, 'p256dh')),
            'auth_token' => $encode(hash_hkdf('sha256', $user->email, 16, 'auth')),
            'content_encoding' => 'aesgcm',
        ]);
    }

    private function seedShortLinks(Household $household): void
    {
        $links = [
            ['pantry23', 'Pantry shopping list', url('/apps/our-corner/activities'), true],
            ['garage23', 'Directions to the cabin', 'https://www.google.com/maps/dir/?api=1&destination=15.2993,74.1240', true],
            ['bench789', 'Old garden tag (retired)', url('/apps/our-history'), false],
        ];

        foreach ($links as [$code, $label, $destination, $enabled]) {
            ShortLink::factory()->create([
                'code' => $code,
                'label' => $label,
                'destination' => $destination,
                'enabled' => $enabled,
                'created_by' => $household->admin->id,
            ]);
        }
    }

    private function seedInvitation(Household $household): void
    {
        Invitation::forceCreate([
            'email' => self::INVITE_EMAIL,
            'role_name' => 'user',
            'token_hash' => hash('sha256', self::INVITE_TOKEN),
            'expires_at' => $household->today->addDays(7),
            'invited_by_user_id' => $household->admin->id,
        ]);
    }
}
