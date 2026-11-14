<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Services\PlexMetadataFetcher;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PlexMetadataFetcherTest extends TestCase
{
    use RefreshDatabase;

    private PlexMetadataFetcher $fetcher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fetcher = new PlexMetadataFetcher;
    }

    public function test_parses_og_tags_from_plex_share_link(): void
    {
        Http::fake([
            '*plex.tv*' => Http::response(
                file_get_contents(base_path('tests/Fixtures/Corner/plex-watch-the-man-from-earth.html')),
                200
            ),
        ]);

        $result = $this->fetcher->fetch('https://l.plex.tv/abc12345');

        $this->assertIsArray($result);
        $this->assertSame('The Man from Earth', $result['title']);
        $this->assertSame(2007, $result['year']);
        // Entity-decoded: &amp; -> &.
        $this->assertSame('https://images.plex.tv/photo?size=large-1280&url=abc', $result['poster_url']);
        $this->assertIsString($result['watch_url']);
        $this->assertNotSame('', $result['watch_url']);
    }

    public function test_follows_a_redirect_that_stays_on_plex(): void
    {
        Http::fake([
            'l.plex.tv/*' => Http::response('', 302, ['Location' => 'https://watch.plex.tv/movie/the-man-from-earth']),
            'watch.plex.tv/*' => Http::response(
                file_get_contents(base_path('tests/Fixtures/Corner/plex-watch-the-man-from-earth.html')),
                200
            ),
        ]);

        $result = $this->fetcher->fetch('https://l.plex.tv/abc12345');

        $this->assertIsArray($result);
        $this->assertSame('https://watch.plex.tv/movie/the-man-from-earth', $result['watch_url']);
    }

    #[DataProvider('redirectsOffPlex')]
    public function test_refuses_a_redirect_that_leaves_plex(string $location): void
    {
        Http::fake([
            'l.plex.tv/*' => Http::response('', 302, ['Location' => $location]),
            '*' => Http::response('<meta property="og:title" content="internal">', 200),
        ]);

        $result = $this->fetcher->fetch('https://l.plex.tv/abc12345');

        $this->assertNull($result);
        Http::assertNotSent(fn (Request $request): bool => ! str_starts_with($request->url(), 'https://l.plex.tv/'));
    }

    /** @return array<string, array{string}> */
    public static function redirectsOffPlex(): array
    {
        return [
            'cloud metadata address' => ['http://169.254.169.254/latest/meta-data'],
            'another host over https' => ['https://internal.example/admin'],
            'plex over plain http' => ['http://watch.plex.tv/movie/x'],
        ];
    }

    public function test_returns_null_on_timeout(): void
    {
        Http::fake(function () {
            throw new ConnectionException('cURL error 28: Operation timed out');
        });

        $result = $this->fetcher->fetch('https://watch.plex.tv/movie/x');

        $this->assertNull($result);
    }

    public function test_returns_null_when_no_og_title(): void
    {
        Http::fake([
            '*plex.tv*' => Http::response('<html><head><title>app.plex.tv</title></head><body></body></html>', 200),
        ]);

        $result = $this->fetcher->fetch('https://app.plex.tv/desktop#!/some-library-item');

        $this->assertNull($result);
    }

    public function test_rejects_non_images_plex_poster(): void
    {
        Http::fake([
            '*plex.tv*' => Http::response(
                '<html><head><title>Watch Something</title>'
                .'<meta property="og:title" content="Something">'
                .'<meta property="og:image" content="https://evil.com/poster.jpg">'
                .'</head><body></body></html>',
                200
            ),
        ]);

        $result = $this->fetcher->fetch('https://watch.plex.tv/movie/something');

        $this->assertIsArray($result);
        $this->assertSame('Something', $result['title']);
        $this->assertNull($result['poster_url']);
    }

    public function test_preview_endpoint_returns_metadata(): void
    {
        $user = User::factory()->create();

        Http::fake([
            '*plex.tv*' => Http::response(
                file_get_contents(base_path('tests/Fixtures/Corner/plex-watch-the-man-from-earth.html')),
                200
            ),
        ]);

        $this->actingAs($user)
            ->getJson('/api/corner/plex-preview?url='.urlencode('https://l.plex.tv/abc12345'))
            ->assertOk()
            ->assertJson(['ok' => true, 'title' => 'The Man from Earth']);
    }

    public function test_preview_endpoint_not_ok_for_non_plex(): void
    {
        $user = User::factory()->create();

        Http::fake();

        $this->actingAs($user)
            ->getJson('/api/corner/plex-preview?url='.urlencode('https://evil.com/x'))
            ->assertOk()
            ->assertJson(['ok' => false]);

        Http::assertNothingSent();
    }

    /** @return array<string, array{string}> */
    public static function hostsOffPlex(): array
    {
        return [
            'another host' => ['https://evil.example.com/x'],
            'cloud metadata address' => ['http://169.254.169.254/latest/meta-data'],
            'plex spoofed as a subdomain' => ['https://plex.tv.evil.com/x'],
        ];
    }

    #[DataProvider('hostsOffPlex')]
    public function test_a_host_off_plex_is_rejected_before_any_request(string $url): void
    {
        Http::fake();

        $this->assertNull($this->fetcher->fetch($url));

        Http::assertNothingSent();
    }
}
