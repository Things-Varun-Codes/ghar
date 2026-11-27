<?php

namespace Tests\Feature\Seeders;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Policies\CornerListPolicy;
use App\MiniApps\Corner\Support\ListIcon;
use App\MiniApps\Corner\Support\PictureCache;
use App\MiniApps\History\Models\Event;
use App\MiniApps\History\Models\EventComment;
use App\MiniApps\History\Models\EventReaction;
use App\MiniApps\Mailbox\Models\Citation;
use App\MiniApps\Mailbox\Models\Coupon;
use App\MiniApps\Mailbox\Models\Expense;
use App\MiniApps\Mailbox\Models\ExpenseGroup;
use App\MiniApps\Mailbox\Models\MailboxMessage;
use App\MiniApps\Mailbox\Models\Postcard;
use App\MiniApps\Mailbox\Support\ExpenseBalances;
use App\Shell\Models\Invitation;
use App\Shell\Models\ShortLink;
use App\Shell\Models\User;
use App\Shell\Services\LinkableEntities;
use App\Shell\Support\Region;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DevDataSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

class DevDataSeederTest extends TestCase
{
    use RefreshDatabase;

    private string $storage;

    protected function setUp(): void
    {
        parent::setUp();

        // The seeder primes Corner's picture cache under storage/; keep it out of the real one.
        $this->storage = sys_get_temp_dir().'/ghar-seed-test-'.bin2hex(random_bytes(4));
        File::ensureDirectoryExists($this->storage);
        $this->app->useStoragePath($this->storage);

        config(['shell.media_disk' => 'local', 'services.image_ai.disk' => 'local', 'media-library.disk_name' => 'local']);
        Storage::fake('local');
        (new RoleSeeder)->run();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->storage);

        parent::tearDown();
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
        $leela = $this->user(DevDataSeeder::LEELA);

        $nisha = $this->user(DevDataSeeder::NISHA);

        $this->assertSame(6, User::count());
        $this->assertTrue($admin->hasRole('admin'));

        foreach ([$ravi, $meera, $kabir, $leela] as $member) {
            $this->assertTrue($member->hasRole('user'));
            $this->assertFalse($member->hasRole('admin'));
            $this->assertTrue(Hash::check(DevDataSeeder::PASSWORD, $member->password));
        }

        // Two-step sign-in: on for Kabir and Leela, with the documented secret and codes.
        foreach ([$kabir, $leela] as $member) {
            $this->assertTrue($member->hasEnabledTwoFactorAuthentication());
            $this->assertSame(DevDataSeeder::TWO_FACTOR_SECRET, decrypt($member->two_factor_secret));
            $this->assertSame(DevDataSeeder::RECOVERY_CODES, $member->recoveryCodes());
        }
        $this->assertFalse($ravi->hasEnabledTwoFactorAuthentication());

        // Past one page of Songs, the Timeline and the Gallery.
        $songs = CornerList::query()->where('slug', 'songs')->firstOrFail();
        $this->assertGreaterThan(50, $songs->items()->count());
        $this->assertGreaterThan(20, Event::count());
        $this->assertGreaterThan(24, Media::where('collection_name', 'photos')->count());

        $this->assertGreaterThan(1, Event::query()->distinct()->count('creator_id'));
        // Songs is the per-person list: several people's loves, and one song loved by more than one.
        $this->assertTrue($songs->done_per_person);
        $marks = DB::table('corner_item_marks')->whereIn('item_id', $songs->items()->select('id'));
        $this->assertGreaterThan(1, (clone $marks)->distinct()->count('user_id'));
        $this->assertGreaterThan(1, (int) (clone $marks)->selectRaw('count(*) as n')->groupBy('item_id')->orderByDesc('n')->value('n'));
        $this->assertSame(0, $songs->items()->whereNotNull('done_at')->count());
        $this->assertGreaterThan(0, DB::table('entity_references')->where('from_type', 'history.event')->count());

        // The four lists an upgrade leaves, then the household's own.
        $this->assertSame(
            ['songs', 'movies', 'places', 'activities'],
            CornerList::query()->whereNull('created_by_user_id')->orderBy('position')->pluck('slug')->all(),
        );
        $this->assertSame(
            CornerList::query()->count(),
            CornerList::query()->distinct()->count('position'),
        );
        $this->assertSame(0, DB::table('corner_items')
            ->join('corner_lists', 'corner_lists.id', '=', 'corner_items.list_id')
            ->whereNull('corner_lists.created_by_user_id')
            ->whereNull('corner_items.legacy_id')
            ->count());
        $this->assertLessThan(
            (int) DB::table('corner_items')->whereNull('legacy_id')->min('id'),
            (int) DB::table('corner_items')->max('legacy_id'),
        );

        // A list only its creator added to, one others added to, and an empty quiet one.
        $books = CornerList::query()->where('slug', 'books')->firstOrFail();
        $this->assertSame($ravi->id, $books->created_by_user_id);
        $this->assertTrue((new CornerListPolicy)->delete($ravi, $books));
        $shared = CornerList::query()->where('slug', 'restaurants-we-keep-meaning-to-try-on-a-slow-sunday')->firstOrFail();
        $this->assertSame($meera->id, $shared->created_by_user_id);
        $this->assertGreaterThan(40, mb_strlen($shared->name));
        $this->assertFalse((new CornerListPolicy)->delete($meera, $shared));
        $this->assertTrue((new CornerListPolicy)->update($meera, $shared));
        $quiet = CornerList::query()->where('created_by_user_id', $kabir->id)->firstOrFail();
        $this->assertFalse($quiet->notify_on_add);
        $this->assertSame(0, $quiet->items()->count());

        // Every icon is one the page can draw, and the ids the docs name stay put.
        foreach (CornerList::all() as $list) {
            $this->assertTrue(ListIcon::isValid($list->icon), "{$list->slug} icon {$list->icon}");
        }
        $this->assertSame(range(100, 161), $songs->items()->orderBy('id')->pluck('id')->all());
        $this->assertSame([185, 186, 192], $shared->items()->orderBy('id')->pluck('id')->all());
        $weekend = CornerList::query()->where('slug', 'weekend-ideas')->firstOrFail();
        $this->assertSame('sailboat', $weekend->icon);
        $this->assertSame($meera->id, $weekend->created_by_user_id);
        $this->assertSame(range(187, 191), $weekend->items()->orderBy('id')->pluck('id')->all());

        // Every web picture is already in the cache: pages show them without the network.
        Http::fake();
        $pictures = Item::query()->where('image_url', 'like', 'http%')->pluck('image_url')->unique();
        $this->assertNotEmpty($pictures);
        foreach ($pictures as $picture) {
            $this->assertNotNull(app(PictureCache::class)->get($picture), "{$picture} is not primed");
        }
        Http::assertNothingSent();

        // Every link carries the key a new one would, so pasting it again is a duplicate.
        $this->assertSame(0, Item::query()->whereNotNull('url')->whereNull('url_key')->count());

        // Every Corner link a moment holds, old-style or new, resolves.
        $linkable = app(LinkableEntities::class);
        $refs = DB::table('entity_references')->where('to_type', 'like', 'corner.%')->get();
        $this->assertContains('corner.item', $refs->pluck('to_type')->all());
        $this->assertContains('corner.song', $refs->pluck('to_type')->all());
        foreach ($refs as $ref) {
            $this->assertNotNull($linkable->resolve($ref->to_type, (int) $ref->to_id), "{$ref->to_type}:{$ref->to_id} does not resolve");
        }

        // Two memories from this day in earlier years, one of them Meera's birthday, which is today.
        $today = Region::today();
        $this->assertSame($today->format('m-d'), $meera->birthday?->format('m-d'));
        $onThisDay = Event::query()
            ->whereMonth('occurred_on', $today->month)
            ->whereDay('occurred_on', $today->day)
            ->whereYear('occurred_on', '<', $today->year)
            ->get();
        $this->assertCount(2, $onThisDay);
        $this->assertSame([$meera->id], $onThisDay->pluck('birthday_user_id')->filter()->values()->all());

        // Ravi's monsoon drive holds the thread: Meera, Kabir, Ravi, then Nisha before she left;
        // Meera and Asha react.
        $monsoon = Event::query()->where('title', 'Monsoon drive to the coast')->firstOrFail();
        $this->assertSame($ravi->id, $monsoon->creator_id);
        $this->assertSame(
            [$meera->id, $kabir->id, $ravi->id, $nisha->id],
            EventComment::query()->where('event_id', $monsoon->id)->orderBy('id')->pluck('author_id')->all(),
        );
        $this->assertEqualsCanonicalizing(
            [$meera->id, $admin->id],
            EventReaction::query()->where('event_id', $monsoon->id)->distinct()->pluck('user_id')->all(),
        );

        // Every generated file exists, so nothing 404s in the browser.
        $media = Media::where('collection_name', 'photos')->firstOrFail();
        $this->assertTrue($media->hasGeneratedConversion('thumb'));
        Storage::disk('local')->assertExists($media->getPathRelativeToRoot());
        Storage::disk('local')->assertExists(Postcard::query()->firstOrFail()->image_key);

        // The first row of each type is Ravi to Meera only: the visibility fixture.
        foreach ([MailboxMessage::query()->orderBy('id')->firstOrFail(), Postcard::query()->orderBy('id')->firstOrFail()] as $mail) {
            $this->assertSame($ravi->id, $mail->sender_id);
            $this->assertSame([$meera->id], $mail->recipients()->pluck('users.id')->all());
        }

        foreach ([Coupon::query()->orderBy('id')->firstOrFail(), Citation::query()->orderBy('id')->firstOrFail()] as $slip) {
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
        $this->assertTrue(DB::table('mailbox_postcard_recipients')->whereNull('read_at')->exists());
        $this->assertTrue(DB::table('mailbox_postcard_recipients')->whereNotNull('read_at')->exists());

        $this->assertTrue(Coupon::where('status', Coupon::STATUS_ISSUED)->where('redeemed_count', 0)->exists());
        $this->assertTrue(Coupon::where('status', Coupon::STATUS_REQUESTED)->exists());
        $this->assertTrue(Coupon::where('status', Coupon::STATUS_ISSUED)->where('redeemed_count', '>', 0)->exists());
        $this->assertTrue(Coupon::where('status', Coupon::STATUS_DEPLETED)->exists());
        $this->assertTrue(Citation::where('status', Citation::STATUS_ISSUED)->exists());
        $this->assertTrue(Citation::where('status', Citation::STATUS_PAID)->exists());

        // Coast trip is Ravi's and Meera's alone, and Meera owes Ravi in it.
        $coast = ExpenseGroup::query()->where('name', 'Coast trip')->sole();
        $this->assertSame([$ravi->id, $meera->id], $coast->memberIds());
        $this->assertSame(0, ExpenseGroup::visibleTo($kabir)->whereKey($coast->id)->count());
        $this->assertSame(0, ExpenseGroup::visibleTo($admin)->whereKey($coast->id)->count());
        $this->assertEquals([$ravi->id => 340000, $meera->id => -340000], ExpenseBalances::netsIn($coast));

        $general = ExpenseGroup::general();
        $this->assertSame(0, array_sum(ExpenseBalances::netsIn($general)));
        $this->assertSame(1, Expense::onlyTrashed()->where('group_id', $general->id)->count());
        $this->assertTrue(Expense::where('group_id', $general->id)->where('is_settlement', true)->exists());
        $this->assertTrue(Expense::where('group_id', $general->id)->where('split_mode', Expense::SPLIT_EXACT)->where('is_settlement', false)->exists());
        // 10000 between three leaves one paisa over.
        $this->assertSame([3333, 3333, 3334], Expense::where('title', 'Auto to the station')->sole()->shares->pluck('amount')->sort()->values()->all());

        // Nisha is a former member: no role, and Ravi still owes her for the farewell dinner.
        $this->assertTrue($nisha->isFormer());
        $this->assertSame([], $nisha->getRoleNames()->all());
        $this->assertSame(90000, ExpenseBalances::netsIn($general)[$nisha->id]);
        $this->assertTrue(MailboxMessage::visibleTo($meera)->where('sender_id', $nisha->id)->exists());

        $archived = ExpenseGroup::query()->whereNotNull('archived_at')->sole();
        $this->assertSame([], array_filter(ExpenseBalances::netsIn($archived)));

        $this->assertSame(2, ShortLink::where('enabled', true)->count());
        $this->assertSame(1, ShortLink::where('enabled', false)->count());
        $this->assertSame(1, Invitation::query()->pending()->count());
        $this->assertSame(hash('sha256', DevDataSeeder::INVITE_TOKEN), Invitation::query()->firstOrFail()->token_hash);

        // A second run changes nothing.
        (new DevDataSeeder)->run();
        $nisha = $this->user(DevDataSeeder::NISHA);

        $this->assertSame(6, User::count());
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
            DevDataSeeder::LEELA,
            DevDataSeeder::NISHA,
            DevDataSeeder::INVITE_TOKEN,
        ] as $value) {
            $this->assertStringContainsString($value, $harness);
        }
    }
}
