<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Models\Item;
use App\MiniApps\Corner\Support\PictureCache;
use App\Shell\Models\User;
use App\Shell\Services\Rooms;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

/** Pictures are served from this app, fetched once through the fetch guards and kept on disk. */
class PictureRouteTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    private const SOURCE = 'https://images.example.com/cover.png';

    private string $storage;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // The picture cache lives under storage/; keep this test's pictures out of the real one.
        $this->storage = sys_get_temp_dir().'/ghar-picture-test-'.bin2hex(random_bytes(4));
        File::ensureDirectoryExists($this->storage);
        $this->app->useStoragePath($this->storage);

        $this->publicDns();
        $this->user = User::factory()->create();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->storage);

        parent::tearDown();
    }

    private static function png(): string
    {
        return (string) base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    }

    private function itemWithPicture(?string $source = self::SOURCE): Item
    {
        return Item::factory()->create([
            'list_id' => (CornerList::query()->where('slug', 'songs')->first() ?? $this->songs())->id,
            'added_by_user_id' => $this->user->id,
            'image_url' => $source,
        ]);
    }

    public function test_a_kept_picture_is_served_privately_and_for_good(): void
    {
        Http::fake();
        app(PictureCache::class)->put(self::SOURCE, self::png(), 'image/png');
        $item = $this->itemWithPicture();

        $response = $this->actingAs($this->user)->get((string) $item->pictureUrl());

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/png');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $cache = (string) $response->headers->get('Cache-Control');
        $this->assertStringContainsString('private', $cache);
        $this->assertStringContainsString('immutable', $cache);
        $this->assertStringContainsString('max-age=604800', $cache);
        $this->assertStringNotContainsString('public', $cache);
        $file = $response->baseResponse;
        $this->assertInstanceOf(BinaryFileResponse::class, $file);
        $this->assertSame(self::png(), file_get_contents($file->getFile()->getPathname()));
        Http::assertNothingSent();
    }

    public function test_a_picture_is_fetched_once_then_served_from_disk(): void
    {
        Http::fake([self::SOURCE => Http::response(self::png(), 200, ['Content-Type' => 'image/png'])]);
        $item = $this->itemWithPicture();

        $this->actingAs($this->user)->get((string) $item->pictureUrl())->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->actingAs($this->user)->get((string) $item->pictureUrl())->assertOk();

        Http::assertSentCount(1);
    }

    public function test_no_picture_is_a_404(): void
    {
        Http::fake();
        $none = $this->itemWithPicture(null);

        $this->assertNull($none->pictureUrl());

        $this->actingAs($this->user)->get("/apps/our-corner/items/{$none->id}/picture?v=x")->assertNotFound();
        $this->actingAs($this->user)->get('/apps/our-corner/items/999999999/picture?v=x')->assertNotFound();
        Http::assertNothingSent();
    }

    public function test_a_picture_that_cannot_be_fetched_is_a_404_and_is_not_tried_again_for_a_while(): void
    {
        Http::fake([self::SOURCE => Http::response('gone', 404)]);
        $item = $this->itemWithPicture();

        $this->actingAs($this->user)->get((string) $item->pictureUrl())->assertNotFound();
        $this->actingAs($this->user)->get((string) $item->pictureUrl())->assertNotFound();
        Http::assertSentCount(1);

        // Ten minutes on, it is tried again.
        $this->travel(601)->seconds();

        $this->actingAs($this->user)->get((string) $item->pictureUrl())->assertNotFound();
        Http::assertSentCount(2);
    }

    public function test_bytes_that_are_not_a_picture_are_refused_whatever_they_are_called(): void
    {
        Http::fake([
            'images.example.com/fake.jpg' => Http::response('<html><script>alert(1)</script></html>', 200, ['Content-Type' => 'image/jpeg']),
            'images.example.com/page' => Http::response('<html></html>', 200, ['Content-Type' => 'text/html']),
            'images.example.com/vector.svg' => Http::response('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 200, ['Content-Type' => 'image/svg+xml']),
        ]);

        foreach (['fake.jpg', 'page', 'vector.svg'] as $path) {
            $item = $this->itemWithPicture("https://images.example.com/{$path}");
            $this->actingAs($this->user)->get((string) $item->pictureUrl())->assertNotFound();
        }

        $this->assertSame([], glob(app(PictureCache::class)->directory().'/*.bin'));
    }

    public function test_a_picture_on_a_private_address_is_never_fetched(): void
    {
        Http::fake();
        $item = $this->itemWithPicture('http://169.254.169.254/latest/meta-data/iam.png');

        $this->actingAs($this->user)->get((string) $item->pictureUrl())->assertNotFound();
        Http::assertNothingSent();
    }

    public function test_the_address_changes_when_the_picture_does(): void
    {
        $item = $this->itemWithPicture();
        $first = $item->pictureUrl();

        $this->assertStringStartsWith("/apps/our-corner/items/{$item->id}/picture?v=", (string) $first);
        $this->assertSame($first, Item::pictureUrlFor($item->id, self::SOURCE));

        $item->update(['image_url' => 'https://images.example.com/other.png']);
        $this->assertNotSame($first, $item->pictureUrl());
    }

    public function test_a_guest_and_a_room_that_is_off_get_nothing(): void
    {
        Http::fake();
        app(PictureCache::class)->put(self::SOURCE, self::png(), 'image/png');
        $item = $this->itemWithPicture();

        $this->get((string) $item->pictureUrl())->assertRedirect('/login');

        app(Rooms::class)->set('our-corner', false);
        $this->actingAs($this->user)->get((string) $item->pictureUrl())->assertNotFound();
        $this->actingAs($this->user)->get('/api/corner/picture-preview?url='.urlencode(self::SOURCE))->assertNotFound();
    }

    // Previews

    public function test_a_preview_is_served_for_an_hour_and_saving_it_costs_no_second_fetch(): void
    {
        Http::fake([self::SOURCE => Http::response(self::png(), 200, ['Content-Type' => 'image/png'])]);

        $response = $this->actingAs($this->user)->get('/api/corner/picture-preview?url='.urlencode(self::SOURCE));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/png');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $cache = (string) $response->headers->get('Cache-Control');
        $this->assertStringContainsString('private', $cache);
        $this->assertStringContainsString('max-age=3600', $cache);
        $this->assertStringNotContainsString('immutable', $cache);

        $item = $this->itemWithPicture();
        $this->actingAs($this->user)->get((string) $item->pictureUrl())->assertOk();
        Http::assertSentCount(1);
    }

    public function test_a_preview_that_fails_or_is_not_a_picture_is_a_404(): void
    {
        Http::fake([
            'images.example.com/missing.png' => Http::response('', 404),
            'images.example.com/page.png' => Http::response('<html></html>', 200, ['Content-Type' => 'image/png']),
        ]);

        foreach (['missing.png', 'page.png'] as $path) {
            $this->actingAs($this->user)
                ->get('/api/corner/picture-preview?url='.urlencode("https://images.example.com/{$path}"))
                ->assertNotFound();
        }

        Http::fake();
        $this->actingAs($this->user)
            ->get('/api/corner/picture-preview?url='.urlencode('http://10.0.0.1/a.png'))
            ->assertNotFound();
        Http::assertNothingSent();
    }

    public function test_a_preview_needs_a_web_address(): void
    {
        Http::fake();

        foreach (['', 'not a url', 'file:///etc/passwd', 'data:image/png;base64,AAAA'] as $bad) {
            $this->actingAs($this->user)
                ->getJson('/api/corner/picture-preview?url='.urlencode($bad))
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['url']);
        }
        Http::assertNothingSent();
    }
}
