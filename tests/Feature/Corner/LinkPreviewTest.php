<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Services\LinkPreview;
use App\Shell\Models\User;
use App\Shell\Support\Http\SafeFetcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Corner\Concerns\MakesCornerLists;
use Tests\TestCase;

/** What a pasted link says about itself. Pages are faked; no site is known by name. */
class LinkPreviewTest extends TestCase
{
    use MakesCornerLists;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->publicDns();
    }

    private function preview(): LinkPreview
    {
        return app(LinkPreview::class);
    }

    private static function page(string $head): array
    {
        return ["<!doctype html><html><head>{$head}</head><body><p>Body</p></body></html>", 200, ['Content-Type' => 'text/html; charset=utf-8']];
    }

    public function test_an_oembed_endpoint_the_page_links_to_wins(): void
    {
        Http::fake([
            'video.example.com/watch*' => Http::response(...self::page(
                '<title>Page title</title>'
                .'<meta property="og:title" content="OG title">'
                .'<meta property="og:image" content="https://video.example.com/og.jpg">'
                .'<link rel="alternate" type="application/json+oembed" href="/oembed?url=https%3A%2F%2Fvideo.example.com%2Fwatch%3Fv%3D1&amp;format=json">'
            )),
            'video.example.com/oembed*' => Http::response([
                'title' => 'Rain on the Tin Roof',
                'author_name' => 'The Monsoon Club',
                'thumbnail_url' => 'https://img.video.example.com/1/hq.jpg',
                'provider_name' => 'VideoSite',
            ]),
        ]);

        $this->assertSame([
            'title' => 'Rain on the Tin Roof',
            'image_url' => 'https://img.video.example.com/1/hq.jpg',
            'author' => 'The Monsoon Club',
            'site_name' => 'VideoSite',
        ], $this->preview()->lookup('https://video.example.com/watch?v=1'));

        Http::assertSent(fn ($request) => $request->url() === 'https://video.example.com/oembed?url=https%3A%2F%2Fvideo.example.com%2Fwatch%3Fv%3D1&format=json');
    }

    public function test_open_graph_then_twitter_then_the_title_and_relative_images_are_resolved(): void
    {
        Http::fake([
            'shop.example.com/og' => Http::response(...self::page(
                '<title>Ignored</title>'
                .'<meta property="og:title" content="  The   Salt &amp; Road ">'
                .'<meta property="og:image" content="/img/cover.jpg">'
                .'<meta property="og:site_name" content="Example Books">'
                .'<meta name="author" content="A. Writer">'
                .'<meta name="twitter:title" content="Twitter title">'
            )),
            'shop.example.com/tw' => Http::response(...self::page(
                '<title>Ignored</title>'
                .'<meta name="twitter:title" content="Twitter title">'
                .'<meta name="twitter:image:src" content="../pics/tw.png">'
            )),
            'shop.example.com/a/title' => Http::response(...self::page('<title>Just a title</title>')),
        ]);

        $this->assertSame([
            'title' => 'The Salt & Road',
            'image_url' => 'https://shop.example.com/img/cover.jpg',
            'author' => 'A. Writer',
            'site_name' => 'Example Books',
        ], $this->preview()->lookup('https://shop.example.com/og'));

        $tw = $this->preview()->lookup('https://shop.example.com/tw');
        $this->assertSame('Twitter title', $tw['title']);
        $this->assertSame('https://shop.example.com/pics/tw.png', $tw['image_url']);
        $this->assertSame('shop.example.com', $tw['site_name']);

        $plain = $this->preview()->lookup('https://shop.example.com/a/title');
        $this->assertSame('Just a title', $plain['title']);
        $this->assertNull($plain['image_url']);
        $this->assertNull($plain['author']);
    }

    public function test_without_a_picture_the_largest_icon_that_is_not_svg_is_used(): void
    {
        Http::fake([
            'www.example.org/*' => Http::response(...self::page(
                '<title>Icons</title>'
                .'<link rel="icon" href="/favicon.ico">'
                .'<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png">'
                .'<link rel="icon" type="image/svg+xml" sizes="512x512" href="/icon.svg">'
                .'<link rel="apple-touch-icon" href="/touch.png">'
                .'<link rel="icon" sizes="96x96" href="/icon-96.png">'
            )),
        ]);

        $found = $this->preview()->lookup('https://www.example.org/page');

        $this->assertSame('https://www.example.org/touch.png', $found['image_url']);
        $this->assertSame('example.org', $found['site_name']);
    }

    public function test_a_link_straight_to_a_picture_is_its_own_picture(): void
    {
        Http::fake(['photos.example.com/*' => Http::response('png-bytes', 200, ['Content-Type' => 'image/png'])]);

        $this->assertEquals([
            'title' => null,
            'image_url' => 'https://photos.example.com/kite.png',
            'author' => null,
            'site_name' => 'photos.example.com',
        ], $this->preview()->lookup('https://photos.example.com/kite.png'));
    }

    public function test_an_unreachable_or_odd_page_gives_nothing_but_its_host(): void
    {
        $empty = fn (string $site): array => ['title' => null, 'image_url' => null, 'author' => null, 'site_name' => $site];

        Http::fake(fn () => throw new ConnectionException('timed out'));
        $this->assertSame($empty('down.example.com'), $this->preview()->lookup('https://www.down.example.com/x'));

        Http::fake(['*' => Http::response('nope', 500, ['Content-Type' => 'text/html'])]);
        $this->assertSame($empty('error.example.com'), $this->preview()->lookup('https://error.example.com/x'));

        Http::fake(['*' => Http::response('%PDF-1.7', 200, ['Content-Type' => 'application/pdf'])]);
        $this->assertSame($empty('files.example.com'), $this->preview()->lookup('https://files.example.com/x.pdf'));
    }

    public function test_a_link_to_a_private_address_is_never_fetched(): void
    {
        Http::fake();
        $this->app->instance(SafeFetcher::class, new SafeFetcher(fn (): array => ['192.168.1.10']));

        $this->assertSame(
            ['title' => null, 'image_url' => null, 'author' => null, 'site_name' => 'router.example.com'],
            $this->preview()->lookup('http://router.example.com/'),
        );
        $this->assertSame(
            ['title' => null, 'image_url' => null, 'author' => null, 'site_name' => '169.254.169.254'],
            $this->preview()->lookup('http://169.254.169.254/latest/meta-data/'),
        );
        Http::assertNothingSent();
    }

    public function test_an_oembed_endpoint_on_a_private_address_is_skipped_and_the_page_still_reads(): void
    {
        Http::fake([
            'blog.example.com/*' => Http::response(...self::page(
                '<meta property="og:title" content="Post">'
                .'<link rel="alternate" type="application/json+oembed" href="http://127.0.0.1/oembed">'
            )),
        ]);

        $this->assertSame('Post', $this->preview()->lookup('https://blog.example.com/post')['title']);
        Http::assertSentCount(1);
    }

    public function test_a_lookup_is_cached_however_the_link_is_written(): void
    {
        Http::fake(['*' => Http::response(...self::page('<title>Once</title>'))]);

        $found = array_map(fn (string $url): ?string => $this->preview()->lookup($url)['title'], [
            'https://example.com/a?b=1&c=2',
            'https://example.com/a?b=1&c=2',
            'HTTPS://EXAMPLE.com/a/?c=2&b=1&utm_source=x#top',
        ]);

        $this->assertSame(['Once', 'Once', 'Once'], $found);

        Http::assertSentCount(1);
    }

    public function test_the_preview_endpoint_answers_json(): void
    {
        Http::fake([
            'nothing.example.com/*' => Http::response('', 404),
            '*' => Http::response(...self::page('<meta property="og:title" content="Found it"><meta property="og:image" content="https://example.com/p.jpg">')),
        ]);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/corner/link-preview?url='.urlencode('https://example.com/thing'))
            ->assertOk()
            ->assertExactJson([
                'ok' => true,
                'title' => 'Found it',
                'image_url' => 'https://example.com/p.jpg',
                'author' => null,
                'site_name' => 'example.com',
            ]);

        $this->actingAs($user)
            ->getJson('/api/corner/link-preview?url='.urlencode('https://nothing.example.com/'))
            ->assertOk()
            ->assertJson(['ok' => false, 'title' => null, 'site_name' => 'nothing.example.com']);

        foreach (['', 'not a url', 'javascript:alert(1)', 'file:///etc/passwd'] as $bad) {
            $this->actingAs($user)
                ->getJson('/api/corner/link-preview?url='.urlencode($bad))
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['url']);
        }
    }

    public function test_the_preview_endpoint_needs_a_login(): void
    {
        Http::fake();

        // An api/ address answers a guest with 401 rather than a login page.
        $this->get('/api/corner/link-preview?url='.urlencode('https://example.com/'))->assertUnauthorized();
        $this->get('/api/corner/picture-preview?url='.urlencode('https://example.com/a.jpg'))->assertUnauthorized();
        Http::assertNothingSent();
    }
}
