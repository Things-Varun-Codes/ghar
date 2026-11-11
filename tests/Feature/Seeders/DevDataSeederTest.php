<?php

namespace Tests\Feature\Seeders;

use App\MiniApps\Corner\Models\Song;
use App\MiniApps\History\Models\Event;
use App\MiniApps\Mailbox\Models\Bouquet;
use App\MiniApps\Mailbox\Models\Challan;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\Shell\Models\Invitation;
use App\Shell\Models\ShortLink;
use App\Shell\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DevDataSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

class DevDataSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['shell.media_disk' => 'local', 'services.bouquet.disk' => 'local', 'media-library.disk_name' => 'local']);
        Storage::fake('local');
        (new RoleSeeder)->run();
    }

    private function user(string $email): User
    {
        return User::query()->where('email', $email)->firstOrFail();
    }

    // One run, many assertions: seeding draws and converts every photo.
    public function test_it_seeds_the_documented_household_and_every_state(): void
    {
        (new DevDataSeeder)->run();

        $admin = $this->user(DevDataSeeder::ADMIN);
        $ravi = $this->user(DevDataSeeder::RAVI);
        $meera = $this->user(DevDataSeeder::MEERA);
        $kabir = $this->user(DevDataSeeder::KABIR);

        $this->assertSame(4, User::count());
        $this->assertTrue($admin->hasRole('admin'));

        foreach ([$ravi, $meera, $kabir] as $member) {
            $this->assertTrue($member->hasRole('user'));
            $this->assertFalse($member->hasRole('admin'));
            $this->assertTrue(Hash::check(DevDataSeeder::PASSWORD, $member->password));
        }

        // Past one page of Songs, the Timeline and the Gallery.
        $this->assertGreaterThan(50, Song::count());
        $this->assertGreaterThan(20, Event::count());
        $this->assertGreaterThan(24, Media::where('collection_name', 'photos')->count());

        $this->assertGreaterThan(1, Event::query()->distinct()->count('creator_id'));
        $this->assertGreaterThan(1, Song::query()->whereNotNull('done_at')->distinct()->count('done_by_user_id'));
        $this->assertGreaterThan(0, DB::table('entity_references')->where('from_type', 'history.event')->count());

        // Every generated file exists, so nothing 404s in the browser.
        $media = Media::where('collection_name', 'photos')->firstOrFail();
        $this->assertTrue($media->hasGeneratedConversion('thumb'));
        Storage::disk('local')->assertExists($media->getPathRelativeToRoot());
        Storage::disk('local')->assertExists(Bouquet::query()->firstOrFail()->image_key);

        // The first row of each type is Ravi to Meera only: the visibility fixture.
        foreach ([MailboxMessage::query()->orderBy('id')->firstOrFail(), Bouquet::query()->orderBy('id')->firstOrFail()] as $mail) {
            $this->assertSame($ravi->id, $mail->sender_id);
            $this->assertSame([$meera->id], $mail->recipients()->pluck('users.id')->all());
        }

        foreach ([Coupon::query()->orderBy('id')->firstOrFail(), Challan::query()->orderBy('id')->firstOrFail()] as $slip) {
            $this->assertSame([$ravi->id, $meera->id], [$slip->issuer_id, $slip->recipient_id]);
        }

        $first = MailboxMessage::query()->orderBy('id')->firstOrFail()->id;
        $this->assertSame(0, MailboxMessage::visibleTo($kabir)->whereKey($first)->count());
        $this->assertSame(0, MailboxMessage::visibleTo($admin)->whereKey($first)->count());

        // Single and multi-recipient, read and unread.
        $recipientCounts = DB::table('mailbox_message_recipients')->groupBy('message_id')->selectRaw('count(*) as c')->pluck('c');
        $this->assertContains(1, $recipientCounts);
        $this->assertGreaterThan(1, $recipientCounts->max());
        $this->assertTrue(DB::table('mailbox_message_recipients')->whereNull('read_at')->exists());
        $this->assertTrue(DB::table('mailbox_message_recipients')->whereNotNull('read_at')->exists());
        $this->assertTrue(DB::table('mailbox_bouquet_recipients')->whereNull('read_at')->exists());
        $this->assertTrue(DB::table('mailbox_bouquet_recipients')->whereNotNull('read_at')->exists());

        $this->assertTrue(Coupon::where('status', Coupon::STATUS_ISSUED)->where('redeemed_count', 0)->exists());
        $this->assertTrue(Coupon::where('status', Coupon::STATUS_REQUESTED)->exists());
        $this->assertTrue(Coupon::where('status', Coupon::STATUS_ISSUED)->where('redeemed_count', '>', 0)->exists());
        $this->assertTrue(Coupon::where('status', Coupon::STATUS_DEPLETED)->exists());
        $this->assertTrue(Challan::where('status', Challan::STATUS_ISSUED)->exists());
        $this->assertTrue(Challan::where('status', Challan::STATUS_PAID)->exists());

        $this->assertSame(2, ShortLink::where('enabled', true)->count());
        $this->assertSame(1, ShortLink::where('enabled', false)->count());
        $this->assertSame(1, Invitation::query()->pending()->count());
        $this->assertSame(hash('sha256', DevDataSeeder::INVITE_TOKEN), Invitation::query()->firstOrFail()->token_hash);

        // A second run changes nothing.
        (new DevDataSeeder)->run();
        $this->assertSame(4, User::count());
    }

    public function test_it_refuses_production(): void
    {
        $this->app['env'] = 'production';

        $this->expectException(RuntimeException::class);

        (new DevDataSeeder)->run();
    }

    public function test_it_refuses_a_real_media_disk(): void
    {
        config(['shell.media_disk' => 's3']);

        $this->expectException(RuntimeException::class);

        (new DevDataSeeder)->run();
    }

    public function test_database_seeder_only_seeds_roles_in_production(): void
    {
        $this->app['env'] = 'production';

        $this->seed(DatabaseSeeder::class);

        $this->assertSame(0, User::count());
    }

    public function test_the_harness_credentials_match_the_seeder(): void
    {
        $harness = file_get_contents(base_path('scripts/lib/dev-data.mjs'));

        foreach ([
            DevDataSeeder::PASSWORD,
            DevDataSeeder::ADMIN,
            DevDataSeeder::RAVI,
            DevDataSeeder::MEERA,
            DevDataSeeder::KABIR,
            DevDataSeeder::INVITE_TOKEN,
        ] as $value) {
            $this->assertStringContainsString($value, $harness);
        }
    }
}
