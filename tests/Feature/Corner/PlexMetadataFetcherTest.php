<?php

namespace Tests\Feature\Corner;

use App\MiniApps\Corner\Services\PlexMetadataFetcher;
use App\Shell\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
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

    public function test_rejects_non_plex_host(): void
    {
        Http::fake();

        $result = $this->fetcher->fetch('https://evil.example.com/x');

        $this->assertNull($result);
        Http::assertNothingSent();
    }

    public function test_rejects_ssrf_metadata_ip(): void
    {
        Http::fake();

        $result = $this->fetcher->fetch('http://169.254.169.254/latest/meta-data');

        $this->assertNull($result);
        Http::assertNothingSent();
    }

    public function test_rejects_subdomain_spoof_host(): void
    {
        Http::fake();

        $result = $this->fetcher->fetch('https://plex.tv.evil.com/x');

        $this->assertNull($result);
        Http::assertNothingSent();
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
}
